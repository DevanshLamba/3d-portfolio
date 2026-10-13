// Kept apart from the Lab components so the rest of the assistant can name a
// tab without loading the Lab chunk.

export type LabTab = "neural" | "rag" | "attention" | "kmeans" | "regression";

export const LAB_TABS: { id: LabTab; label: string; blurb: string }[] = [
  { id: "neural", label: "Neural net", blurb: "Train a small network on spirals, XOR or circles and watch its decision boundary form." },
  { id: "rag", label: "RAG playground", blurb: "Paste any text, tune chunk size and overlap, and query it with the same retrieval engine the assistant uses." },
  { id: "attention", label: "Self-attention", blurb: "softmax(QKᵀ/√d) over a sentence you type, one heatmap per head." },
  { id: "kmeans", label: "k-means", blurb: "Lloyd's algorithm with k-means++ seeding, one iteration at a time." },
  { id: "regression", label: "Regression", blurb: "Fit a polynomial by gradient descent and push the degree up until it overfits." },
];
