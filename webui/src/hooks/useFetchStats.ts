import { useEffect, useRef, useState } from 'react';

import { SWARM_STATE } from 'constants/swarm';
import useInterval from 'hooks/useInterval';
import { useGetStatsQuery } from 'redux/api/swarm';
import { useAction, useSelector } from 'redux/hooks';
import { swarmActions } from 'redux/slice/swarm.slice';
import { uiActions } from 'redux/slice/ui.slice';
import { roundToDecimalPlaces } from 'utils/number';

const STATS_REFETCH_INTERVAL = 2000;

export default function useFetchStats() {
  const setSwarm = useAction(swarmActions.setSwarm);
  const setUi = useAction(uiActions.setUi);
  const updateCharts = useAction(uiActions.updateCharts);
  const updateChartMarkers = useAction(uiActions.updateChartMarkers);
  const swarm = useSelector(({ swarm }) => swarm);
  const previousSwarmState = useRef(swarm.state);
  const [shouldAddMarker, setShouldAddMarker] = useState(false);

  const { data: statsData, refetch: refetchStats, error } = useGetStatsQuery();

  const shouldRunRefetchInterval =
    swarm.state === SWARM_STATE.SPAWNING || swarm.state === SWARM_STATE.RUNNING;

  const updateStats = () => {
    if (!statsData) {
      return;
    }

    try {
      const {
        currentResponseTimePercentiles = {},
        extendedStats,
        stats,
        errors,
        totalRps = 0,
        customMetrics = {},
        charts,
        totalFailPerSec = 0,
        failRatio = 0,
        workers,
        userCount = 0,
        totalAvgResponseTime = 0,
      } = statsData;

      const time = new Date().toISOString();

      if (shouldAddMarker) {
        setShouldAddMarker(false);
        updateChartMarkers(time);
      }

      const totalRpsRounded = roundToDecimalPlaces(totalRps, 2);
      const totalFailPerSecRounded = roundToDecimalPlaces(totalFailPerSec, 2);
      const totalFailureRatioRounded = roundToDecimalPlaces(failRatio * 100);
      
      // 安全地处理自定义指标
      const getRoundedCustomMetrics = () => {
        if (!customMetrics || typeof customMetrics !== 'object') {
          return {};
        }
        return Object.fromEntries(
          Object.entries(customMetrics)
            .filter(([, val]) => typeof val === 'number')
            .map(([key, val]) => [
              key,
              [time, roundToDecimalPlaces(val, 2)]
            ])
        );
      };

      // 安全地处理响应时间百分位数
      const percentilesWithTime = currentResponseTimePercentiles && typeof currentResponseTimePercentiles === 'object'
        ? Object.entries(currentResponseTimePercentiles).reduce(
            (percentiles, [key, value]) => ({
              ...percentiles,
              [key]: [time, typeof value === 'number' ? value : 0],
            }),
            {},
          )
        : {};

      const newChartEntry = {
        ...percentilesWithTime,
        currentRps: [time, totalRpsRounded],
        currentFailPerSec: [time, totalFailPerSecRounded],
        totalAvgResponseTime: [time, roundToDecimalPlaces(totalAvgResponseTime, 2)],
        userCount: [time, userCount],
        ...getRoundedCustomMetrics(),
        time,
      };
      
      setUi({
        extendedStats,
        stats,
        errors,
        totalRps: totalRpsRounded,
        failRatio: totalFailureRatioRounded,
        workers,
        userCount,
        renderableSwarmCharts: charts,
        customMetrics,
      });
      updateCharts(newChartEntry);
    } catch (e) {
      console.error('Error updating stats:', e);
    }
  };

  // Guaranteed refetch regardless of previous fetch status
  const safeRefetch = async () => {
    try {
      await refetchStats();
    } catch (e) {
      console.error('Error refetching stats:', e);
      // Always try again if refetch fails
      refetchStats().catch(err => console.error('Forced refetch failed:', err));
    }
  };

  useEffect(() => {
    if (statsData) {
      setSwarm({ state: statsData.state });
    }
  }, [statsData && statsData.state]);

  // Log errors to help with debugging
  useEffect(() => {
    if (error) {
      console.error('Stats query error:', error);
    }
  }, [error]);

  useInterval(updateStats, STATS_REFETCH_INTERVAL, {
    shouldRunInterval: !!statsData && shouldRunRefetchInterval,
  });

  useInterval(safeRefetch, STATS_REFETCH_INTERVAL, {
    shouldRunInterval: shouldRunRefetchInterval,
  });

  useEffect(() => {
    if (swarm.state === SWARM_STATE.RUNNING && previousSwarmState.current === SWARM_STATE.STOPPED) {
      setShouldAddMarker(true);
    }

    previousSwarmState.current = swarm.state;
  }, [swarm.state, previousSwarmState]);
}
