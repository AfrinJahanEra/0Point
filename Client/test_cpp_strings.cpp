#include <bits/stdc++.h>
using namespace std;

int main() {
    string name = "ZeroPoint";
    string greeting = "Hello, ";
    greeting += name;
    
    int n = 5;
    double pi = 3.14159;
    bool flag = true;
    
    int arr[5] = {10, 20, 30, 40, 50};
    vector<int> nums = {1, 2, 3, 4, 5};
    
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += arr[i];
    }
    
    int len = name.length();
    string sub = name.substr(0, 4);
    
    cout << greeting << endl;
    cout << "Sum: " << sum << endl;
    cout << "Length: " << len << endl;
    cout << "Substring: " << sub << endl;
    
    return 0;
}
