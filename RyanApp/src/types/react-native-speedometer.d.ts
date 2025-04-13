declare module 'react-native-speedometer' {
  interface Label {
    name: string;
    labelColor: string;
    activeBarColor: string;
  }

  interface SpeedometerProps {
    value: number;
    size?: number;
    minValue?: number;
    maxValue?: number;
    labels: Label[];
    labelStyle?: object;
    labelNoteStyle?: object;
    innerCircleStyle?: object;
    halfCircleStyle?: object;
  }

  const RNSpeedometer: React.FC<SpeedometerProps>;
  export default RNSpeedometer;
} 