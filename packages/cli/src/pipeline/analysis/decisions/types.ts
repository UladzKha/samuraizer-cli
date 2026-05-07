export type DecisionItem = {
    text: string;
};

export type DecisionsResult = {
    items: DecisionItem[];
    model: string;
    sourceTranscriptPath: string;
    createdAt: string;
};
