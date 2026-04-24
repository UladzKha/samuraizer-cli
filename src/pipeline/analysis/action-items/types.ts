export type ActionItem = {
    text: string;
    owner: string | null;
    dueDate: string | null;
};

export type ActionItemsResult = {
    items: ActionItem[];
    model: string;
    sourceTranscriptPath: string;
    createdAt: string;
};
