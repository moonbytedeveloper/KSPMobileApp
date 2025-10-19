import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, getSelectedCompanyUUID } from './tokenStorage';
import { Alert } from 'react-native'; // optional: show user messages in RN
import Config from 'react-native-config';
import { CommonActions } from '@react-navigation/native';

const BASE_URL = Config.API_URL; // no fallback; must be provided by env
const PATHS = {
    login: Config.API_LOGIN_PATH,
    refresh: Config.API_REFRESH_PATH,
    kspAuth: Config.API_KSP_PATH,
    forgotPassword: Config.API_FORGOT_PASSWORD_PATH,
    verifyCode: Config.API_VERIFY_CODE_PATH,
    resetPassword: Config.API_RESET_PASSWORD_PATH,
    profile: Config.API_PROFILE_PATH,
};

try {
    console.log('[CONFIG] API_URL =', BASE_URL);
    console.log('[CONFIG] PATHS =', PATHS);
} catch (_) {}

const api = axios.create({
	baseURL: BASE_URL,
	headers: {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${getAccessToken()}`,
	},
	// don't set timeout here unless you want a global timeout
});

// A separate client used only for token refresh requests (no interceptors)
const refreshClient = axios.create({
	baseURL: BASE_URL,
	headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
});

let isRefreshing = false;
let failedQueue = [];

// Navigation reference for global navigation
let navigationRef = null;

// Function to set navigation reference
export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

// Function to get navigation reference
export const getNavigationRef = () => {
  return navigationRef;
};

// Function to handle session expiration
const handleSessionExpired = async () => {
  try {
    // Clear all tokens
    await clearTokens();
    
    // Show session expired popup
    Alert.alert(
      'Session Expired',
      'Please login again your session is expired',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to login screen
            if (navigationRef) {
              navigationRef.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            }
          }
        }
      ],
      { cancelable: false }
    );
  } catch (error) {
    console.log('Error handling session expiration:', error);
  }
};

const processQueue = (error, token = null) => {
	failedQueue.forEach(prom => {
		if (error) prom.reject(error);
		else prom.resolve(token);
	});
	failedQueue = [];
};

// Request interceptor: attach access token and company/environment UUIDs
api.interceptors.request.use(
	async config => {
		try {
			const token = await getAccessToken();
			if (token) {
				config.headers = config.headers || {};
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (err) {
			// ignore token read errors (optionally log)
		}

		// Add company UUID to all requests
		try {
			const selectedCompanyUUID = await getSelectedCompanyUUID();

			// Add company UUID to request params for GET requests
			if (config.method === 'get' || config.method === 'GET') {
				config.params = config.params || {};
				if (selectedCompanyUUID) {
					config.params.cmpUuid = selectedCompanyUUID;
				}
			} else {
				// For POST/PUT/DELETE requests, add to data or params
				if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
					// Add to data if it's a JSON object
					if (selectedCompanyUUID) {
						config.data.cmpUuid = selectedCompanyUUID;
					}
				} else {
					// Add to params for FormData or other cases
					config.params = config.params || {};
					if (selectedCompanyUUID) {
						config.params.cmpUuid = selectedCompanyUUID;
					}
				}
			}
		} catch (err) {
			// ignore UUID read errors (optionally log)
			console.log('Error getting company UUID for API request:', err);
		}

		try {
			const method = (config.method || 'GET').toUpperCase();
            const fullUrl = `${config.baseURL || BASE_URL}${config.url || ''}`;
            
            // Log the complete URL with parameters
            let logUrl = fullUrl;
            if (config.params && Object.keys(config.params).length > 0) {
                const paramString = new URLSearchParams(config.params).toString();
                logUrl = `${fullUrl}?${paramString}`;
            }
            
			console.log('[HTTP]', method, logUrl);
			if (config.params && Object.keys(config.params).length > 0) {
				console.log('[HTTP PARAMS]', config.params);
			}
		} catch (_) {}

		// allow cancellation via signal (React Query passes signal)
		// axios v1+ supports passing signal in config
		return config;
	},
	error => Promise.reject(error)
);


// Response interceptor: handle 401 -> refresh
api.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config;

		try {
			const status = error?.response?.status;
			const url = `${originalRequest?.baseURL || BASE_URL}${originalRequest?.url || ''}`;
			console.log('[HTTP ERROR]', status, url, error?.message);
		} catch (_) {}

		// if no response or not a 401, just reject
		if (!error.response || error.response.status !== 401) {
			// optional logging
			// console.error('API error:', error?.response?.status, error?.response?.data);
			return Promise.reject(error);
		}

		// Prevent refresh for auth-related endpoints (login/forgot/verify/reset/KSP)
        const urlPath = originalRequest?.url || '';
        const authPaths = [PATHS.login, PATHS.forgotPassword, PATHS.verifyCode, PATHS.resetPassword, PATHS.kspAuth].filter(Boolean);
        const isAuthRelated = authPaths.some(p => typeof p === 'string' && urlPath.startsWith(p));
		if (isAuthRelated) {
			// For auth endpoints, just reject the error without trying to refresh
			return Promise.reject(error);
		}
		
		// Special case: if refresh endpoint fails, handle session expiration
		if (urlPath.startsWith(PATHS.refresh)) {
			await handleSessionExpired();
			return Promise.reject(error);
		}

		if (originalRequest._retry) {
			// already retried, reject
			return Promise.reject(error);
		}

		originalRequest._retry = true;

		if (isRefreshing) {
			// queue the request while refresh is in progress
			return new Promise(function (resolve, reject) {
				failedQueue.push({ resolve, reject });
			})
				.then(token => {
					originalRequest.headers.Authorization = 'Bearer ' + token;
					return api(originalRequest);
				})
				.catch(err => Promise.reject(err));
		}

		isRefreshing = true;

		try {
			const refreshToken = await getRefreshToken();
			if (!refreshToken) {
				// No token to refresh with; clear and reject original error
				await clearTokens();
				return Promise.reject(error);
			}

			// Call refresh endpoint
            const refreshPath = PATHS.refresh;
            const resp = await refreshClient.post(refreshPath, { refreshToken });
			console.log('Refresh response in interceptor:', resp.data);

			// Handle different possible response formats
			const responseData = resp.data?.Data || resp.data;
			const { AccessToken, RefreshToken } = responseData?.Token || responseData || {};
			
			if (!AccessToken || !RefreshToken) {
				throw new Error('Invalid refresh response - missing tokens');
			}

			// persist tokens
			await setTokens({ accessToken: AccessToken, refreshToken: RefreshToken });

			// replay queued requests
			processQueue(null, AccessToken);

			// update header & retry original
			originalRequest.headers.Authorization = 'Bearer ' + AccessToken;
			return api(originalRequest);
		} catch (err) {
			processQueue(err, null);
			// refresh failed -> clear tokens & force logout flow in your app
			await handleSessionExpired();
			console.log('Refresh failed -> clear tokens & force logout flow in your app', err);
			return Promise.reject(err);
		} finally {
			isRefreshing = false;
		}
	}
);

export default api;


