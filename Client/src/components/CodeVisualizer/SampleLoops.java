// Sample Java code with various loops for testing the Loop Visualizer

public class SampleLoops {
    public static void main(String[] args) {
        // Simple for loop
        for (int i = 0; i < 5; i++) {
            System.out.println("Iteration: " + i);
            int sum = i * (i + 1) / 2;
            System.out.println("Sum: " + sum);
        }

        // Nested for loops
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                System.out.println("Outer: " + i + ", Inner: " + j);
                int product = i * j;
                System.out.println("Product: " + product);
            }
        }

        // While loop
        int count = 0;
        while (count < 5) {
            System.out.println("While loop count: " + count);
            count++;
        }

        // Do-while loop
        int x = 0;
        do {
            System.out.println("Do-while loop x: " + x);
            x++;
        } while (x < 3);

        // Enhanced for loop (for-each)
        int[] numbers = {10, 20, 30, 40, 50};
        for (int value : numbers) {
            System.out.println("Array value: " + value);
            int doubled = value * 2;
            System.out.println("Doubled: " + doubled);
        }
    }
}