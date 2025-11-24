export const parseInputs = (algorithmId, inputValues) => {
  // Handle all sorting algorithms the same way
  const sortingAlgorithms = ['bubble-sort', 'quick-sort', 'insertion-sort', 'selection-sort', 'merge-sort', 'heap-sort'];
  
  if (sortingAlgorithms.includes(algorithmId)) {
    const array = inputValues[0]?.split(',').map(Number).filter(n => !isNaN(n)) || [5, 2, 8, 1, 9];
    return { array };
  }
  
  switch (algorithmId) {

    

    
    default:
      return null;
  }
};