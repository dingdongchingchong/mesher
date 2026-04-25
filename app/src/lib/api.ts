import type { IpcApi } from '../types';

function missingApi(): never {
  throw new Error('Desktop API unavailable. Run in Electron mode.');
}

const emptyApi: IpcApi = {
  auth: {
    register: missingApi,
    login: missingApi,
    logout: missingApi,
    bootstrap: missingApi,
  },
  companies: {
    list: missingApi,
    create: missingApi,
    update: missingApi,
    delete: missingApi,
    members: missingApi,
    addMember: missingApi,
    updateMemberRole: missingApi,
    removeMember: missingApi,
  },
  accounts: {
    list: missingApi,
    create: missingApi,
    update: missingApi,
    setActive: missingApi,
    delete: missingApi,
  },
  transactions: {
    list: missingApi,
    create: missingApi,
    update: missingApi,
    delete: missingApi,
  },
  dashboard: {
    summary: missingApi,
  },
  reports: {
    profitLoss: missingApi,
    balanceSheet: missingApi,
  },
  profile: {
    updateName: missingApi,
    changePassword: missingApi,
  },
};

export const api: IpcApi = window.api ?? emptyApi;
