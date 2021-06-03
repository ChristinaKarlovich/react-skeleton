//import store from '@src/store';
import services from '@src/services';
//import apiService, * as api from '@src/api';
import mc from 'merge-change';

export const types = {
  SET: Symbol('SET'),
};

export const initState = {
  user: {},
  token: null, // Опционально, если используется в http.js
  wait: true,
  exists: false,
};

const actions = {
  clear: async (logoutRequest = true) => {
    if (logoutRequest) {
      await services.api.endpoint('users').logout();
    }
    if (process.env.IS_WEB) {
      localStorage.removeItem('token');
    }
    services.store.dispatch({ type: types.SET, payload: mc.update(initState, { wait: false }) });
    services.api.setToken(undefined);
  },

  // По токену восстановление информации об аккаунте
  remind: async () => {
    const token = process.env.IS_WEB ? localStorage.getItem('token') : undefined;
    if (token) {
      // Только для устоновки токена в http
      await actions.save({ token, wait: true, exists: false });
      try {
        const response = await services.api.endpoint('users').current({});

        await actions.save({ token, user: response.data.result, wait: false, exists: true });
      } catch (e) {
        await actions.clear(false);
        throw e;
      }
    } else {
      await actions.clear(false);
    }
  },

  save: async data => {
    if (process.env.IS_WEB) {
      localStorage.setItem('token', data.token);
    }
    services.store.dispatch({ type: types.SET, payload: mc.update({ exists: true }, data) });
    services.api.setToken(data.token);
  },
};

export default actions;
