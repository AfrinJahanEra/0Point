Write-Host "🧪 Testing C++ Execution..." -ForegroundColor Cyan

# Local g++
Write-Host "1. Local g++ test:" -ForegroundColor Green
echo "int main(){return 0;}" | Set-Content test.cpp
& g++ test.cpp -o test.exe
if ($LASTEXITCODE -eq 0) { "✅ Local compile OK" } else { "❌ Local failed" }

# Docker
Write-Host "2. Docker test:" -ForegroundColor Green
cd "C:\Users\afrin\OneDrive\Desktop 1\0Point\Server\docker\cpp-debug"
echo "#include<iostream>`nint main(){std::cout<<`"Docker OK`";}" | Set-Content source.cpp
docker run --rm -v ${PWD}:/home/untrusted -w /home/untrusted zeropoint/cpp-debug