import React from 'react';
import BottomSheetConfirm from './BottomSheetConfirm';

const LogoutConfirmSheet = ({ visible, onConfirm, onCancel }) => {
  return (
    <BottomSheetConfirm
      visible={visible}
      title="Logout"
      message="Are you sure you want to log out?"
      confirmText="Yes"
      cancelText="No"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};

export default LogoutConfirmSheet;


