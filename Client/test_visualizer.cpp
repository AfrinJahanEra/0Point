#include <bits/stdc++.h>
using namespace std;

int main() {
    int a = 10;
    double b = 3.14;
    bool c = true;
    string s = "hello";
    int arr[5] = {1, 2, 3, 4, 5};
    
    int p1 = sizeof(a);
    int p2 = sizeof(b);
    int p3 = sizeof(c);
    int p4 = sizeof(s);
    int p5 = sizeof(arr);
    int p6 = sizeof(arr) / sizeof(arr[0]);
    
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }
    
    cout << "int size: " << p1 << endl;
    cout << "double size: " << p2 << endl;
    cout << "bool size: " << p3 << endl;
    cout << "string size: " << p4 << endl;
    cout << "array size: " << p5 << endl;
    cout << "array length: " << p6 << endl;
    cout << "sum: " << sum << endl;
    
    return 0;
}
