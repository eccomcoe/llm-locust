import {
  ECharts,
  DefaultLabelFormatterCallbackParams,
  LineSeriesOption,
  YAXisComponentOption,
  ScatterSeriesOption,
} from 'echarts';

import {
  ILineChart,
  ILineChartZoomEvent,
  ILineChartTooltipFormatterParams,
} from 'components/LineChart/LineChart.types';
import { ICharts } from 'types/ui.types';
import { formatLocaleString } from 'utils/date';

export const getSeriesData = <ChartType>({
  charts,
  lines,
  scatterplot,
}: Pick<ILineChart<ChartType>, 'charts' | 'lines' | 'scatterplot'>):
  | LineSeriesOption[]
  | ScatterSeriesOption[] =>
  lines.map(({ key, name }) => ({
    symbolSize: 4,
    type: (scatterplot ? 'scatter' : 'line') as any,
    name,
    data: charts[key] as LineSeriesOption['data'],
  }));

const Y_AXIS_CONFIG = {
  type: 'value',
  boundaryGap: [0, '5%'],
};

const createYAxis = <ChartType>({
  splitAxis,
  yAxisLabels,
}: Pick<ILineChart<ChartType>, 'splitAxis' | 'yAxisLabels'>):
  | YAXisComponentOption
  | YAXisComponentOption[] => {
  if (splitAxis && (!yAxisLabels || Array.isArray(yAxisLabels))) {
    return Array(2)
      .fill(Y_AXIS_CONFIG)
      .map((config, index) => ({
        ...config,
        ...(yAxisLabels ? { name: yAxisLabels[index] } : {}),
      }));
  }

  return {
    ...Y_AXIS_CONFIG,
    ...(yAxisLabels ? { name: yAxisLabels } : {}),
  } as YAXisComponentOption;
};

const formatTimeAxis = (value: string) => new Date(value).toLocaleTimeString();

const renderChartTooltipValue = <ChartType>({
  chartValueFormatter,
  value,
}: {
  chartValueFormatter: ILineChart<ChartType>['chartValueFormatter'];
  value: ILineChartTooltipFormatterParams['value'];
}) => {
  if (chartValueFormatter) {
    return chartValueFormatter(value);
  }

  return Array.isArray(value) ? value[1] : value;
};

export const createOptions = <ChartType extends Pick<ICharts, 'time'>>({
  charts,
  title,
  lines,
  colors,
  chartValueFormatter,
  splitAxis,
  yAxisLabels,
  scatterplot,
}: ILineChart<ChartType>) => {
  // 安全地获取时间数据
  const timeData = charts?.time || [];
  const defaultTime = new Date().toISOString();
  const startTime = timeData.length > 0 ? timeData[0] : defaultTime;

  return {
    title: {
      text: title,
      left: 'center',
      top: 0,
      padding: [10, 0, 10, 0]
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params?: ILineChartTooltipFormatterParams[] | null) => {
        if (Array.isArray(params) && params.length > 0 && params.some(param => !!param.value)) {
          return params.reduce(
            (tooltipText, { axisValue, color, seriesName, value }, index) =>
              `
              ${index === 0 ? formatLocaleString(axisValue) : ''}
              ${tooltipText}
              <br>
              <span style="color:${color};">
                ${seriesName}:&nbsp${renderChartTooltipValue<ChartType>({
                  chartValueFormatter,
                  value,
                })}
              </span>
            `,
            '',
          );
        } else {
          return 'No data';
        }
      },
      borderWidth: 0,
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: 25
    },
    xAxis: {
      type: 'time',
      min: startTime,
      startValue: startTime,
      axisLabel: {
        formatter: formatTimeAxis,
        hideOverlap: true
      },
    },
    grid: {
      left: '10%',
      right: '5%',
      top: 60,
      bottom: '10%',
      containLabel: true
    },
    yAxis: createYAxis({ splitAxis, yAxisLabels }),
    series: getSeriesData<ChartType>({ charts, lines, scatterplot }),
    color: colors,
    toolbox: {
      right: 10,
      top: 0,
      feature: {
        dataZoom: {
          title: {
            zoom: 'Zoom Select',
            back: 'Zoom Reset',
          },
          yAxisIndex: false,
        },
        saveAsImage: {
          name: title.replace(/\s+/g, '_').toLowerCase() + '_' + new Date().getTime() / 1000,
          title: 'Download as PNG',
          emphasis: {
            iconStyle: {
              textPosition: 'left',
            },
          },
        },
      },
    },
  };
};

export const createMarkLine = <ChartType extends Pick<ICharts, 'markers'>>(charts: ChartType) => ({
  symbol: 'none',
  label: {
    formatter: (params: DefaultLabelFormatterCallbackParams) => `Run #${params.dataIndex + 1}`,
    padding: [0, 0, 8, 0],
  },
  data: (charts.markers || []).map((timeMarker: string) => ({ xAxis: timeMarker })),
});

export const onChartZoom = (chart: ECharts) => (datazoom: unknown) => {
  const { batch } = datazoom as ILineChartZoomEvent;
  if (!batch) {
    return;
  }

  const [{ start, startValue, end }] = batch;
  const isZoomed = (start > 0 && end <= 100) || startValue > 0;

  chart.setOption({
    dataZoom: [
      {
        type: 'slider',
        show: isZoomed,
      },
    ],
  });
};
