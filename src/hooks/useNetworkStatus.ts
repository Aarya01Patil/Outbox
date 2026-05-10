import NetInfo, {
  type NetInfoState,
  NetInfoStateType,
} from '@react-native-community/netinfo';
import {useEffect, useState} from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoState['type'];
}

const initialNetworkStatus: NetworkStatus = {
  isConnected: true,
  isInternetReachable: null,
  type: NetInfoStateType.unknown,
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(initialNetworkStatus);

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch().then(state => {
      if (mounted) {
        setStatus(mapNetworkState(state));
      }
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      setStatus(mapNetworkState(state));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return status;
}

function mapNetworkState(state: NetInfoState): NetworkStatus {
  return {
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}
