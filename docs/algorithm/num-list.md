## 二分查找

### [704. 二分查找 - 力扣（Leetcode）](https://leetcode.cn/problems/binary-search/)

```java
 public int search(int[] nums, int target) {
        int left=0,right=nums.length-1;
        while(left<=right){
            int mid=left+(right-left)/2;
            if(nums[mid]==target){
                return mid;
            }else if(nums[mid]>target){
                right=mid-1;
            }else{
                left=mid+1;
            }
        }
        return -1;
    }
```

[69. x 的平方根 - 力扣（Leetcode）](https://leetcode.cn/problems/sqrtx/submissions/391186628/)

```java
    public int mySqrt(int x) {
        if(x<2)return x;
        int left=0,right=x;
        while(left<=right){
            int mid=left+(right-left)/2;
            int target = x/mid;
            if(mid==target){
                return mid;
            }else if(mid>target){
                right=mid-1;
            }else{
                left=mid+1;
            }
        }
        return right;
    }

//保留小数
      public static double mySqrt(int x) {
        double err = 1e-9;
        double x0 = 0;
        double x1 = x;
        while(true){
            x0 = 0.5*x1+0.5*x/x1;
            if(Math.abs(x1 - x0) < err){
                break;
            }
            x1 = x0;
        }
        return x1;
    }    
```





## 螺旋矩阵

### [54. 螺旋矩阵](https://leetcode.cn/problems/spiral-matrix/description/)

```java
 public List<Integer> spiralOrder(int[][] matrix) {
        int left=0,right=matrix[0].length-1,top=0,bottom=matrix.length-1;
        List<Integer> res=new ArrayList();
        while(true){
            for(int i=left;i<=right;i++){
                res.add(matrix[top][i]);
            }
            if(++top>bottom) break;
            for(int i=top;i<=bottom;i++){
                res.add(matrix[i][right]);
            }
            if(--right<left)break;
            for(int i=right;i>=left;i--){
                res.add(matrix[bottom][i]);
            }
            if(--bottom<top)break;
            for(int i=bottom;i>=top;i--){
                res.add(matrix[i][left]);
            }            
            if(++left>right)break;
        }
        return res;
 }
```

### [59. 螺旋矩阵 II - 力扣（Leetcode）](https://leetcode.cn/problems/spiral-matrix-ii/description/)

```java
  public int[][] generateMatrix(int n) {
        int left = 0,right=n-1,top=0,bottom=n-1;
        int num=1;
        int[][] res=new int[n][n];
        while(true){
            for(int i=left;i<=right;i++){
                res[top][i]=num++;
            }
            if(++top>bottom)break;
            for(int i=top;i<=bottom;i++){
                res[i][right]=num++;
            }
            if(--right<left)break;
            for(int i=right;i>=left;i--){
                res[bottom][i]=num++;
            }
            if(--bottom<top)break;
            for(int i=bottom;i>=top;i--){
                res[i][left]=num++;
            }
            if(++left>right)break;
        }
        return res;
    }
```

## 栈或队列

### [232. 用栈实现队列 - 力扣（Leetcode）](https://leetcode.cn/problems/implement-queue-using-stacks/)

```java
class MyQueue {

    public Stack<Integer> stack1=new Stack();

    Stack<Integer> stack2=new Stack();

    public MyQueue() {

    }
    
    public void push(int x) {
        stack1.push(x);
    }
    
    public int pop() {
        if(stack2.isEmpty()){
            while(!stack1.isEmpty()){
                stack2.push(stack1.pop());
            }
        }
        return stack2.pop();
    }
    
    public int peek() {
        if(stack2.isEmpty()){
            while(!stack1.isEmpty()){
                stack2.push(stack1.pop());
            }
        }
        return stack2.peek();
    }
    
    public boolean empty() {
        return stack1.isEmpty()&&stack2.isEmpty();
    }
}
```

## 括号问题

### [22. 括号生成 - 力扣（Leetcode）](https://leetcode.cn/problems/generate-parentheses/submissions/391200454/)

```java
    // DFS+少量的剪枝，剪枝的条件为：左括号的数目一旦小于右括号的数目，以及，左括号的数目和右括号数目均小于n
	List<String> res=new ArrayList();
    public List<String> generateParenthesis(int n) {
        dfs("",n,0,0);
        return res;
    }

    public void dfs(String s,int n,int left,int right){
        if(left>n||right>n||right>left){
            return;
        }
        if(left==n&&right==n){
            res.add(s);
            return;
        }
        dfs(s+"(",n,left+1,right);
        dfs(s+")",n,left,right+1);
    }
```

## 两数相加问题

### [415. 字符串相加 - 力扣（Leetcode）](https://leetcode.cn/problems/add-strings/submissions/391523596/?languageTags=java)

```java
  public String addStrings(String num1, String num2) {
        int len1=num1.length()-1,len2=num2.length()-1;
        int add=0;
        StringBuilder res=new StringBuilder();
        while(len1>=0||len2>=0||add>0){
            int sum=0;
            if(len1>=0&&len2>=0){
                sum+=num1.charAt(len1--)-'0'+num2.charAt(len2--)-'0';
            }else if(len1>=0){
                sum+=num1.charAt(len1--)-'0';
            }else if(len2>=0){
                sum+=num2.charAt(len2--)-'0';
            }
            sum+=add;
            add=sum/10;
            sum=sum%10;
            res.append(sum);
        }
        return res.reverse().toString();
    }
```

## 字符串反转问题

### [151. 翻转字符串里的单词](https://leetcode.cn/problems/reverse-words-in-a-string)

先去除所有冗余的空格，再反转整个字符串，再挨个反转单词；这样一步一步写思路比较清晰，同时实现了O(1)空间复杂度。

```java
 public String reverseWords(String s) {
        StringBuilder res=new StringBuilder(s);
        res.reverse();
        StringBuilder res1 = new StringBuilder();
        StringBuilder res2 = new StringBuilder();
        int index=0;
        while(index<res.length()){
            if(res.charAt(index)==' '){
                if(res1.length()>0){
                res1.reverse();
                res2.append(res1);
                res2.append(" ");
                res1=new StringBuilder();
                }
            }else{
                res1.append(res.charAt(index));
            }
            index++;
        }
        if(res1.length()>0){
            res1.reverse();
            res2.append(res1);
        }else{
            res2.deleteCharAt(res2.length()-1);
        }
        return res2.toString();
    }
```

## 子集问题

### [78. 子集 - 力扣（Leetcode）](https://leetcode.cn/problems/subsets/submissions/391590993/)

```java
   List<List<Integer>>  res=new ArrayList();
    public List<List<Integer>> subsets(int[] nums) {
        dfs(new ArrayList(),nums,0);
        return res;
    }

    public void dfs(List<Integer> list,int[] nums,int start){
        if(start>nums.length){
            return;
        }
        res.add(new ArrayList(list));
        for(int i=start;i<nums.length;i++){
            list.add(nums[i]);
            dfs(list,nums,i+1);
            list.remove(list.size()-1);
        }
    }
```

