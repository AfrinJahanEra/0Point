export const parseInputs = (algorithmId, inputValues) => {
  // Handle all sorting algorithms the same way
  const sortingAlgorithms = ['bubble-sort', 'quick-sort', 'insertion-sort', 'selection-sort', 'merge-sort', 'heap-sort'];
  
  if (sortingAlgorithms.includes(algorithmId)) {
    const array = inputValues[0]?.split(',').map(Number).filter(n => !isNaN(n)) || [5, 2, 8, 1, 9];
    return { array };
  }
  
  // Handle search algorithms
  const searchAlgorithms = ['linear-search', 'binary-search'];
  
  if (searchAlgorithms.includes(algorithmId)) {
    const array = inputValues[0]?.split(',').map(Number).filter(n => !isNaN(n)) || [5, 2, 8, 1, 9];
    const target = Number(inputValues[1]) || 0;
    return { array, target };
  }
  
  // Handle tree algorithms
  const treeAlgorithms = ['bst', 'avl-tree', 'trie'];
  
  if (treeAlgorithms.includes(algorithmId)) {
    if (algorithmId === 'trie') {
      // For trie, we handle strings
      const array = inputValues[0]?.split(',').filter(s => s && s.trim() !== '') || ['cat', 'dog', 'car'];
      return { array };
    } else {
      // For BST and AVL, we handle numbers
      const array = inputValues[0]?.split(',').map(Number).filter(n => !isNaN(n)) || [5, 2, 8, 1, 9];
      return { array };
    }
  }
  
  // Handle graph algorithms
  const graphAlgorithms = ['bfs', 'dfs'];
  
  if (graphAlgorithms.includes(algorithmId)) {
    // Parse edges
    const edges = inputValues[0]?.split(',').filter(e => e && e.includes('-')) || ['A-B', 'B-C'];
    // Parse start node
    const startNode = inputValues[1] || 'A';
    return { edges, startNode };
  }
  
  // Handle weighted graph algorithms
  const weightedGraphAlgorithms = ['dijkstra', 'kruskal', 'prim'];
  
  if (weightedGraphAlgorithms.includes(algorithmId)) {
    // Parse weighted edges
    const weightedEdges = inputValues[0]?.split(',').filter(e => e && e.split('-').length === 3) || ['A-B-5', 'B-C-3'];
    
    if (algorithmId === 'kruskal') {
      // Kruskal doesn't need a start node
      return { weightedEdges };
    } else {
      // Dijkstra and Prim need a start node
      const startNode = inputValues[1] || 'A';
      return { weightedEdges, startNode };
    }
  }
  
  switch (algorithmId) {

    

    
    default:
      return null;
  }
};