/**
 * This error is disabled since reducers use the createSlice function, which requires the user to
 * param-reassign. Please do not disable other errors.
 */
/* eslint-disable no-param-reassign */
import { createSelector, createSlice, Draft, PayloadAction } from '@reduxjs/toolkit';

import { PublicKey } from 'core/objects';

import { Server, ServerAddress, ServerState } from '../objects/Server';

/**
 * Reducer & associated function implementation to store all known servers
 */

export interface ServerReducerState {
  byLaoId: {
    [laoId: string]: {
      byAddress: {
        [address: ServerAddress]: ServerState;
      };
      allAddresses: ServerAddress[];
    };
  };
}

const initialState: ServerReducerState = {
  byLaoId: {},
};

export const SERVER_REDUCER_PATH = 'servers';

const serverSlice = createSlice({
  name: SERVER_REDUCER_PATH,
  initialState,
  reducers: {
    addServer: (state: Draft<ServerReducerState>, action: PayloadAction<ServerState>) => {
      const server = action.payload;

      let laoState: ServerReducerState['byLaoId']['string'] = {
        byAddress: {},
        allAddresses: [],
      };

      if (server.laoId in state.byLaoId) {
        laoState = state.byLaoId[server.laoId];
      }

      if (server.address in laoState.byAddress) {
        throw Error(
          `${server.address} is already part of laoState.byAddress. Use updateServer() instead of addServer()`,
        );
      }

      laoState.byAddress[server.address] = server;
      laoState.allAddresses.push(server.address);

      state.byLaoId[server.laoId] = laoState;
    },

    updateServer: (state: Draft<ServerReducerState>, action: PayloadAction<ServerState>) => {
      const updatedServer = action.payload;

      if (!(updatedServer.laoId in state.byLaoId)) {
        return;
      }

      if (!(updatedServer.address in state.byLaoId[updatedServer.laoId].byAddress)) {
        return;
      }

      state.byLaoId[updatedServer.laoId].byAddress[updatedServer.address] = updatedServer;
    },

    removeServer: (state, action: PayloadAction<{ laoId: string; address: string }>) => {
      const { laoId } = action.payload;
      const serverAddress = action.payload.address;

      if (!(laoId in state.byLaoId)) {
        return;
      }

      if (serverAddress in state.byLaoId[laoId].byAddress) {
        delete state.byLaoId[laoId].byAddress[serverAddress];
        state.byLaoId[laoId].allAddresses = state.byLaoId[laoId].allAddresses.filter(
          (address) => address !== serverAddress,
        );
      }
    },

    clearAllServers: (state) => {
      state.byLaoId = {};
    },
  },
});

export const { addServer, clearAllServers, removeServer, updateServer } = serverSlice.actions;

export const serverReduce = serverSlice.reducer;

export default {
  [SERVER_REDUCER_PATH]: serverSlice.reducer,
};

export const getServerState = (state: any): ServerReducerState => state[SERVER_REDUCER_PATH];

/**
 * A function to directly retrieve the public key from the redux store for a given lao id and server address
 * @remark NOTE: This function does not memoize the result. If you need this, use makeServerSelector instead
 * @param laoId The lao id
 * @param address The server address
 * @param state The redux state
 * @returns The public key for the given server address or undefined if there is none
 */
export const getServerPublicKeyByAddress = (
  laoId: string,
  address: ServerAddress,
  state: any,
): PublicKey | undefined => {
  const serverState = getServerState(state);

  if (laoId in serverState.byLaoId && address in serverState.byLaoId[laoId].byAddress) {
    return new PublicKey(serverState.byLaoId[laoId].byAddress[address].publicKey);
  }

  return undefined;
};

/**
 * Creates a server selector for a given lao id and server address. Can for example be used in useSelector()
 * @param laoId The lao id
 * @param address The server address
 * @returns A selector for the server object for the given address or undefined if there is none
 */
export const makeServerSelector = (laoId: string, address: ServerAddress) =>
  createSelector(
    // First input: map of lao ids to servers
    (state) => getServerState(state).byLaoId,
    // Selector: returns the server object associated to the given address
    (byLaoId: ServerReducerState['byLaoId']): Server | undefined => {
      if (laoId in byLaoId && address in byLaoId[laoId].byAddress) {
        return Server.fromState(byLaoId[laoId].byAddress[address]);
      }

      return undefined;
    },
  );
