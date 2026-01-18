# Test code for demonstrating the analysis features
def fibonacci(n):
    """Calculate fibonacci number"""
    if n <= 1:
        return n
    
    a, b = 0, 1
    for i in range(2, n + 1):
        temp = a + b
        a = b
        b = temp
    return b

# Main execution
numbers = [1, 2, 3, 4, 5]
results = []

for num in numbers:
    if num > 0:
        result = fibonacci(num)
        results.append(result)
        print(f"Fibonacci({num}) = {result}")

print("Results:", results)