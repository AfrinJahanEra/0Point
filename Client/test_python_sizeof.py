import sys

a = 10
b = 3.14
c = True
s = "hello"
arr = [1, 2, 3, 4, 5]

p1 = sys.getsizeof(a)
p2 = sys.getsizeof(b)
p3 = sys.getsizeof(c)
p4 = sys.getsizeof(s)
p5 = sys.getsizeof(arr)
p6 = len(arr)

total = 0
for i in range(5):
    total += arr[i]

print("int size:", p1)
print("float size:", p2)
print("bool size:", p3)
print("string size:", p4)
print("list size:", p5)
print("list length:", p6)
print("sum:", total)
