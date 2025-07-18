import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { swarmTemplateArgs } from 'constants/swarm';
import { updateStateWithPayload } from 'redux/utils';
import {
  ICharts,
  ISwarmError,
  ISwarmStat,
  ISwarmRatios,
  ISwarmException,
  ISwarmWorker,
  IExtendedStat,
} from 'types/ui.types';
import { updateArraysAtProps } from 'utils/object';

export interface IUiState {
  extendedStats?: IExtendedStat[];
  totalRps: number;
  failRatio: number;
  startTime: string;
  stats: ISwarmStat[];
  errors: ISwarmError[];
  workers?: ISwarmWorker[];
  exceptions: ISwarmException[];
  ratios: ISwarmRatios;
  charts: ICharts;
  userCount: number;
}

export type UiAction = PayloadAction<Partial<IUiState>>;

const initialState = {
  totalRps: 0,
  failRatio: 0,
  startTime: '',
  stats: [] as ISwarmStat[],
  errors: [] as ISwarmError[],
  exceptions: [] as ISwarmException[],
  charts: swarmTemplateArgs.history?.reduce(updateArraysAtProps, {}) as ICharts,
  ratios: {} as ISwarmRatios,
  userCount: 0,
};

const percentileNullValues = swarmTemplateArgs.percentilesToChart?.reduce(
  (percentilesNullValue, percentile) => ({
    ...percentilesNullValue,
    [`responseTimePercentile${percentile}`]: { value: null },
  }),
  {},
);

const addSpaceToChartsBetweenTests = (charts: ICharts, customMetrics: Record<string, number>) => {
  const getNullifiedCustomMetrics = () => {
    if (!customMetrics || typeof customMetrics !== 'object') {
      return {};
    }
    
    return Object.fromEntries(
      Object.entries(customMetrics)
        .filter(([, value]) => typeof value === 'number')
        .map(([key]) => [key, { value: null }])
    );
  };

  return updateArraysAtProps(charts, {
    ...percentileNullValues,
    currentRps: { value: null },
    currentFailPerSec: { value: null },
    totalAvgResponseTime: { value: null },
    userCount: { value: null },
    ...getNullifiedCustomMetrics(),
    time: '',
  });
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setUi: updateStateWithPayload<IUiState, UiAction>,
    updateCharts: (state, { payload }) => ({
      ...state,
      charts: updateArraysAtProps<ICharts>(state.charts as ICharts, payload),
    }),
    updateChartMarkers: (state, { payload }) => {
      console.log(state.customMetrics, payload, Object.entries(state))
      return {
        ...state,
        charts: {
          ...addSpaceToChartsBetweenTests(state.charts as ICharts, state.customMetrics),
          markers: (state.charts as ICharts).markers
            ? [...((state.charts as ICharts).markers as string[]), payload]
            : [(state.charts.time || [''])[0], payload],
        },
      };
    },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
