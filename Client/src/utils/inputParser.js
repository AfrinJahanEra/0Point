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
  
  switch (algorithmId) {

    

    
    default:
      return null;
  }
};