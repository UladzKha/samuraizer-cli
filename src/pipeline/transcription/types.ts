export type TranscriptSegment = {
    startSec: number;
    endSec: number;
    text: string;
};

export type Transcript = {
    text: string;
    segments: TranscriptSegment[];
    sourceAudioPath: string;
    language?: string;
};
