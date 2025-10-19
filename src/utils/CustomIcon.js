import { createIconSetFromIcoMoon } from 'react-native-vector-icons';
import icomoonConfig from '../assets/fonts/selection.json';

// Single merged icon set
const Icon = createIconSetFromIcoMoon(icomoonConfig, 'icomoon', 'icomoon.ttf');

export default Icon;


// import CustomIcon from '../utils/CustomIcon';

// <CustomIcon name="product-add" size={24} color="#111" />// Old IcoMoon set (selection.json + icomoon.ttf)
// import Icon, { KspIcon } from '../utils/CustomIcon';

// // Usage
// <Icon name="home" size={24} color="#111" />
// <KspIcon name="Ksp-logo" size={28} color="#E34F25" />