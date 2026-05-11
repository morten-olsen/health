import { readFileSync } from 'node:fs';

import { Decoder, Stream } from '@garmin/fitsdk';

type FitRecord = {
  timestamp: Date;
  heartRate?: number;
  cadence?: number;
  fractionalCadence?: number;
  distance?: number;
  enhancedSpeed?: number;
  enhancedAltitude?: number;
  positionLat?: number;
  positionLong?: number;
};

type FitSession = {
  startTime: Date;
  totalElapsedTime?: number;
  totalTimerTime?: number;
  totalDistance?: number;
  totalCalories?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  enhancedAvgSpeed?: number;
  enhancedMaxSpeed?: number;
  totalAscent?: number;
  totalDescent?: number;
  sport?: string;
  subSport?: string;
  totalTrainingEffect?: number;
  totalAnaerobicTrainingEffect?: number;
  totalStrides?: number;
  totalReps?: number;
};

type FitParsed = {
  session: FitSession;
  records: FitRecord[];
};

const parseFit = (filePath: string): FitParsed => {
  const stream = Stream.fromBuffer(readFileSync(filePath));
  const { messages, errors } = new Decoder(stream).read();
  if (errors.length > 0) {
    throw new Error(`FIT decode errors in ${filePath}: ${JSON.stringify(errors)}`);
  }
  const sessionMesg = messages.sessionMesgs?.[0];
  if (!sessionMesg) {
    throw new Error(`FIT file ${filePath} has no session message`);
  }
  return {
    session: sessionMesg as FitSession,
    records: (messages.recordMesgs ?? []) as FitRecord[],
  };
};

export type { FitParsed, FitRecord, FitSession };
export { parseFit };
