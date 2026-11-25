import { createSlice } from '@reduxjs/toolkit';

const savedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('vbus_user') || 'null');
  } catch {
    return null;
  }
})();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('vbus_token') || null,
    user: savedUser,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('vbus_token', action.payload.token);
      localStorage.setItem('vbus_user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('vbus_token');
      localStorage.removeItem('vbus_user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
