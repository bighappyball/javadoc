## 数组

### [剑指 Offer 42. 连续子数组的最大和 - 力扣（Leetcode）](https://leetcode.cn/problems/lian-xu-zi-shu-zu-de-zui-da-he-lcof/submissions/392798185/)

思路: 记录当前sum和,如果sum小于0 则丢弃

```java
  public int maxSubArray(int[] nums) {
        int max=Integer.MIN_VALUE;
        int sum=0;
        for(int i=0;i<nums.length;i++){
            if(sum<0){
                sum=nums[i];
            }else{
                sum+=nums[i];
            }
            max=Math.max(sum,max);
        }
        return max;
    }
```

### [7. 整数反转 - 力扣（Leetcode）](https://leetcode.cn/problems/reverse-integer/submissions/392803677/)

```java
  public int reverse(int x) {
        int res=0;
        //由于存在负数,因此判断条件不等于0
      	while(x!=0){
            //每次取末尾数字
            int tmp = x%10;
             //判断是否 大于 最大32位整数
            int max = tmp>0?(Integer.MAX_VALUE-tmp)/10:Integer.MAX_VALUE/10;
            if (res>max) {
                return 0;
            }
            //判断是否 小于 最小32位整数
            int min = tmp<0?(Integer.MIN_VALUE-tmp)/10:Integer.MIN_VALUE/10;
            System.out.println(min);
            if (res<min) {
                return 0;
            }
            res=res*10+tmp;
            x=x/10;
        }
        return res;
    }
```

### [剑指 Offer 62. 圆圈中最后剩下的数字 - 力扣（Leetcode）](https://leetcode.cn/problems/yuan-quan-zhong-zui-hou-sheng-xia-de-shu-zi-lcof/solutions/)

其实是约瑟夫环问题,数学解决思路: (当前index + m) % 上一轮剩余数字的个数

[详解](https://leetcode.cn/problems/yuan-quan-zhong-zui-hou-sheng-xia-de-shu-zi-lcof/solutions/177639/javajie-jue-yue-se-fu-huan-wen-ti-gao-su-ni-wei-sh/)

```java
  public int lastRemaining(int n, int m) {
        int ans = 0;
        // 最后一轮剩下2个人，所以从2开始反推
        for (int i = 2; i <= n; i++) {
            ans = (ans + m) % i;
        }
        return ans;
    }
```

### [剑指 Offer 39. 数组中出现次数超过一半的数字 - 力扣（Leetcode）](https://leetcode.cn/problems/shu-zu-zhong-chu-xian-ci-shu-chao-guo-yi-ban-de-shu-zi-lcof/submissions/394284187/)

#### **哈希表**

#### **排序**

如果将数组 nums 中的所有元素按照单调递增或单调递减的顺序排序，那么下标为 ⌊n/2]

```java
public int majorityElement(int[] nums) {
        Arrays.sort(nums);
        return nums[nums.length / 2];
    }
```

#### **摩尔投票**

思路

如果我们把众数记为 +1，把其他数记为 −1，将它们全部加起来，显然和大于 0，从结果本身我们可以看出众数比其他数多。

算法

Boyer-Moore 算法的本质和方法四中的分治十分类似。我们首先给出 Boyer-Moore 算法的详细步骤：

我们维护一个候选众数 candidate 和它出现的次数 count。初始时 candidate 可以为任意值，count 为 0；

我们遍历数组 nums 中的所有元素，对于每个元素 x，在判断 x 之前，如果 count 的值为 0，我们先将 x 的值赋予 candidate，随后我们判断 x：

如果 x 与 candidate 相等，那么计数器 count 的值增加 1；

如果 x 与 candidate 不等，那么计数器 count 的值减少 1。

在遍历完成后，candidate 即为整个数组的众数。

```java
  public int majorityElement(int[] nums) {
        int res=0;
        int count=0;
        for(int num:nums){
            if(count==0){
                res=num;
            }
            count+=num==res?1:-1;
        }
        return res;
    }
```





## 二分查找

### [704. 二分查找 ](https://leetcode.cn/problems/binary-search/)

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

### [69. x 的平方根 ](https://leetcode.cn/problems/sqrtx/submissions/391186628/)

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

### [153. 寻找旋转排序数组中的最小值 ](https://leetcode.cn/problems/find-minimum-in-rotated-sorted-array/submissions/392392512/)

```java
  public int findMin(int[] nums) {
        int left=0,right=nums.length-1;
        while(left<right){
            int mid=left+(right-left)/2;
            if(nums[mid]<nums[right]){
                right=mid;
            }else {
                left=mid+1;
            }
        }
        return nums[left];
    }
```

### [74. 搜索二维矩阵 - 力扣（Leetcode）](https://leetcode.cn/problems/search-a-2d-matrix/submissions/392791330/)
### [16. 最接近的三数之和 - 力扣（Leetcode）](https://leetcode.cn/problems/3sum-closest/submissions/393761930/)

```java
// 思路 : 排序加二分查找  
public int threeSumClosest(int[] nums, int target) {
        Arrays.sort(nums);
        int closestNum = nums[0] + nums[1] + nums[2];
        for(int i=0;i<nums.length-2;i++){
            int left=i+1,right=nums.length-1;
            while(left<right){
                int sum=nums[i]+nums[left]+nums[right];
                if (Math.abs(sum - target) < Math.abs(closestNum - target)) {
                    closestNum = sum;
                }
                if(sum>target){
                    right--;
                }else if(sum<target){
                    left++;
                }else{
                    return sum;
                }
            }
        }
        return closestNum;

    }
```






```java
   public boolean searchMatrix(int[][] matrix, int target) {
        int index=searchColumn(matrix,target);
        System.out.println(index);
        if(index<0){
            return false;
        }
        return searchRow(matrix,target,index);
    }

    public int searchColumn(int[][] matrix,int target){
        int low = 0, high = matrix.length - 1;
        while (low < high) {
            // 关键
            int mid = (high - low + 1) / 2 + low;
            if (matrix[mid][0] <= target) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        return low;
    }
    public boolean searchRow(int[][] matrix,int target,int index){
        int left=0,right=matrix[0].length-1;
        while(left <= right){
            int mid=left+(right-left)/2;
            if(matrix[index][mid]==target){
                return true;
            }else if(matrix[index][mid]<target){
                left=mid+1;
            }else{
                right=mid-1;
            }
        }
        return false;
    }
```

### [400. 第 N 位数字 - 力扣（Leetcode）](https://leetcode.cn/problems/nth-digit/solutions/1128000/di-n-wei-shu-zi-by-leetcode-solution-mdl2/)

##### 二分查找

##### 直接计算

思路:由于任何整数都至少是一位数，因此 d 的最小值是 1。对于 d 的上界，可以通过找规律的方式确定。

1 位数的范围是 1 到 9，共有 9 个数，所有 1 位数的位数之和是 1×9=9。
2 位数的取值范围是 10 到 99，共有 90 个数，所有 2 位数的位数之和是 2×90=180。
3 位数的取值范围是 100到 999，共有 900 个数，所有 3 位数的位数之和是 3×900=2700。
……

```java
  public int findNthDigit(int n) {
        // 先确定数为几位;
        // d位数,conut 是d位数一共有多少位
        int d=1, count=9;
        while(n>(long)d*count){
            n-=d*count;
            d++;
            count*=10;
        }
             //定位到数字
        long num=(long)Math.pow(10,d-1)+(n-1)/d;
        //定位到具体某个字符
        char c=String.valueOf(num).charAt((n-1)%d);
        return (int)(c-'0');

    }
```

### [611. 有效三角形的个数 - 力扣（Leetcode）](https://leetcode.cn/problems/valid-triangle-number/submissions/394272779/)

思路: 排序+二分查找

```java
 public int triangleNumber(int[] nums) {
        int res=0,n=nums.length;
        Arrays.sort(nums);
        for(int i=0;i<n;i++){
            for(int j=i+1;j<n;j++){
                int left=j,right=n-1,k=j;
                while(left<=right){
                    int mid=left+(right-left)/2;
                    if(nums[i]+nums[j]>nums[mid]){
                        k=mid;
                        left=mid+1;
                    }else{
                        right=mid-1;
                    }
                }
                // k是最后一个符合的数字,所以结果是res+(k-j)个;
                res+=k-j;
            }
        }
        return res;
    }
```





## 原地算法

### [26. 删除有序数组中的重复项 - 力扣（Leetcode）](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/description/)

```java
  public int removeDuplicates(int[] nums) {
        int index=1;
        int pre=nums[0];
        for(int i=1;i<nums.length;i++){
            if(nums[i]!=pre){
                nums[index++]=nums[i];
                pre=nums[i];
            }
        }
        return index;
    }
```

### [剑指 Offer 21. 调整数组顺序使奇数位于偶数前面 - 力扣（Leetcode）](https://leetcode.cn/problems/diao-zheng-shu-zu-shun-xu-shi-qi-shu-wei-yu-ou-shu-qian-mian-lcof/submissions/392805233/)

```java
   public int[] exchange(int[] nums) {
        int left=0,right=nums.length-1;
        while(left<right){
            if(nums[left]%2==0){
                swap(nums,left,right);
                right--;
            }else{
                left++;
            }
        }
        return nums;
    }

    public void swap(int[] nums,int a,int b){
        int temp=nums[a];
        nums[a]=nums[b];
        nums[b]=temp;
    }
```





## 矩阵问题

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

### [59. 螺旋矩阵 II ](https://leetcode.cn/problems/spiral-matrix-ii/description/)

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

### [498. 对角线遍历 ](https://leetcode.cn/problems/diagonal-traverse/solutions/1597961/dui-jiao-xian-bian-li-by-leetcode-soluti-plz7/)

思路与算法

根据题目要求，矩阵按照对角线进行遍历。设矩阵的行数为 m, 矩阵的列数为 n, 我们仔细观察对角线遍历的规律可以得到如下信息:

- 一共有 m+n−1条对角线，相邻的对角线的遍历方向不同，当前遍历方向为从左下到右上，则紧挨着的下一条对角线遍历方向为从右上到左下；

- 设对角线从上到下的编号为 i∈[0,m+n−2];

  - 当 i 为偶数时，则第 iii 条对角线的走向是从下往上遍历；
  - 当 i 为奇数时，则第 iii 条对角线的走向是从上往下遍历；
- 当第 i 条对角线从下往上遍历时，每次行索引减 1，列索引加 1，直到矩阵的边缘为止：
  - 当 i<m时，则此时对角线遍历的起点位置为 (i,0)；
  - 当 i≥m 时，则此时对角线遍历的起点位置为 (m−1,i−m+1)；
- 当第 i 条对角线从上往下遍历时，每次行索引加 1，列索引减 1，直到矩阵的边缘为止：
  - 当 i<n时，则此时对角线遍历的起点位置为 (0,i)；
  - 当 i≥n时，则此时对角线遍历的起点位置为 (i−n+1,n−1)；

```java
    public int[] findDiagonalOrder(int[][] mat) {
        int m=mat.length,n=mat[0].length;
        int[] res=new int[m*n];
        int pos=0;
        for (int i = 0; i < m + n - 1; i++) {
            if(i%2==1){
                int x=i<n?0:i-n+1;
                int y=i<n?i:n-1;
                while(x<m&&y>=0){
                    res[pos++]=mat[x++][y--];
                }
            }else{
                int x = i<m?i:m-1;
                int y = i<m?0:i-m+1;
                while(x>=0&&y<n){
                    res[pos++]=mat[x--][y++];
                }
            }
        }
        return res;
    }
```



## 栈或队列

### [232. 用栈实现队列 ](https://leetcode.cn/problems/implement-queue-using-stacks/)

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

### [225. 用队列实现栈 - 力扣（Leetcode）](https://leetcode.cn/problems/implement-stack-using-queues/solutions/)

一个队列为主队列，一个为辅助队列，当入栈操作时，我们先将主队列内容导入辅助队列，然后将入栈元素放入主队列队头位置，再将辅助队列内容，依次添加进主队列即可。

```java
class MyStack {

    Deque<Integer> deque=new ArrayDeque();
    Deque<Integer> deque1=new ArrayDeque();

    public MyStack() {

    }
    
    public void push(int x) {
        while(!deque.isEmpty()){
            deque1.add(deque.poll());
        }
        deque.add(x);
        while(!deque1.isEmpty()){
            deque.add(deque1.poll());
        }
    }
    
    public int pop() {
       return deque.poll();
    }
    
    public int top() {
        return deque.peek();
    }
    
    public boolean empty() {
        return deque.isEmpty();
    }
}
```



### [739. 每日温度 ](https://leetcode.cn/problems/daily-temperatures/submissions/392617724/)

```java
        // 存当前的位置索引
        Stack<Integer> stack=new Stack();
        int[] res=new int[temperatures.length];
        for(int i=0;i<temperatures.length;i++){
            while(!stack.isEmpty()&&temperatures[i]>temperatures[stack.peek()]){
                int pre=stack.pop();
                res[pre]=i-pre;
            }
            stack.push(i);
        }
        return res;
    }
```

### [678. 有效的括号字符串 - 力扣（Leetcode）](https://leetcode.cn/problems/valid-parenthesis-string/submissions/394276440/)

```java
 public boolean checkValidString(String s) {
        Stack<Integer> stack=new Stack();
        Stack<Integer> stack1=new Stack();
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            if(c=='('){
                stack.push(i);
            }else if(c=='*'){
                stack1.push(i);
            }else{
                if(stack.isEmpty()&&stack1.isEmpty())return false;
                if(stack.isEmpty())stack1.pop();
                else stack.pop();
            }
        }
        while(!stack.isEmpty()&&!stack1.isEmpty()){
            if(stack.peek()>stack1.peek())return false;
            stack.pop();
            stack1.pop();
        }
        return stack.isEmpty();
    }
```



## 括号问题

### [22. 括号生成 ](https://leetcode.cn/problems/generate-parentheses/submissions/391200454/)

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

### [415. 字符串相加 ](https://leetcode.cn/problems/add-strings/submissions/391523596/?languageTags=java)

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

## 进制转换问题

### [168. Excel表列名称 - 力扣（Leetcode）](https://leetcode.cn/problems/excel-sheet-column-title/submissions/394341831/)

```java
public String convertToTitle(int columnNumber) {
        StringBuffer sb=new StringBuffer();
        while(columnNumber>0){
            columnNumber--;
            int s=columnNumber%26;
            sb.append((char)('A'+s));
            columnNumber/=26;
        }
        return sb.reverse().toString();
    }
```



## 字符串问题

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

### [224. 基本计算器 ](https://leetcode.cn/problems/basic-calculator/submissions/392609823/)

```java
   public int calculate(String s) {
        // 符号栈 +存1,-存-1
        Deque<Integer> queue=new ArrayDeque();
        queue.push(1);
        int sign=1;
        int sum=0;
        int i=0;
        while(i<s.length()){
            char c=s.charAt(i);
            if(Character.isDigit(c)){
                long num = 0;
                while (i < s.length() && Character.isDigit(s.charAt(i))) {
                    num = num * 10 + (s.charAt(i) - '0');
                    i++;
                }
                sum += sign * num;
            }else if(c=='+'){
                sign = queue.peek();
                i++;
            }else if(c=='-'){
                sign=-queue.peek();
                i++;
            }else if(c=='('){
                queue.push(sign);
                i++;
            }else if(c==')'){
                queue.pop();
                i++;
            }else{
                i++;
            }
        }
        return sum;
    }
```



### [227. 基本计算器 II](https://leetcode.cn/problems/basic-calculator-ii)

```java
class Solution {
    public int calculate(String s) {
        Stack<Integer> stack=new Stack();
        int num = 0;
        char preSign='+';
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            if(Character.isDigit(c)){
                num=num*10+(c-'0');
            }
            if(!Character.isDigit(c)&&c!=' ' || i==s.length()-1){
                switch(preSign){
                    case '+':
                        stack.push(num);
                        break;
                    case '-':
                        stack.push(-num);
                        break;
                    case '*':
                        stack.push(stack.pop()*num);
                        break;
                    default:
                        stack.push(stack.pop()/num);
                }
                preSign=c;
                num=0;
            }
        }
        int res=0;
        while(!stack.isEmpty()){
            res+=stack.pop();
        }
        return res;
    }
}
```

### [50. Pow(x, n) - 力扣（Leetcode）](https://leetcode.cn/problems/powx-n/submissions/392787475/)

思路:
快速幂 + 递归:「快速幂算法」的本质是分治算法。举个例子，如果我们要计算 x64
 ，我们可以按照：*x*→*x*2→*x*4→*x*9→*x*19→*x*38→*x*77

```java
  public double myPow(double x, int n) {
        return n>=0?dfs(x,n):1/dfs(x,n);
    }

    public double dfs(double x,int n){
        if(n==0){
            return 1.0;
        }
        double y = dfs(x,n/2) ;
        return n%2==0?y*y:y*y*x;

    }
```



### [468. 验证IP地址 ](https://leetcode.cn/problems/validate-ip-address/)

```java
class Solution {
    public String validIPAddress(String queryIP) {
        return isIpv4(queryIP)==true?"IPv4":isIpv6(queryIP)?"IPv6":"Neither";
    }

    public boolean isIpv4(String queryIP){
        // 若干最后n位都是切割符，split(" “)不会继续切分，split(” ", -1)会继续切分
        String[] ips=queryIP.split("\\.",-1);
        if(ips.length!=4){
            return false;
        }
        for(String ip:ips){
            if(ip.length()==0||ip.length()>3)return false;
            int sum=0;
            for(int i=0;i<ip.length();i++){
                char c = ip.charAt(i);
                if(!Character.isDigit(c)){
                    return false;
                }
                sum=sum*10+(c-'0');
            }
            // String.value(sum).equals(ip)) 可能存在数字前置0
            if(sum>255||!String.valueOf(sum).equals(ip))return false;
        }
        return true;
    }

    public boolean isIpv6(String queryIP){
        String[] ips=queryIP.split(":",-1);
        if(ips.length!=8){
            return false;
        }
        for(String ip:ips){
            ip=ip.toLowerCase();
            if(ip.length()==0||ip.length()>4)return false;
            for(int i=0;i<ip.length();i++){
                char c=ip.charAt(i);
                if(!Character.isDigit(c)&&!(c>='a'&&c<='f')){
                    return false;
                }
            }
        }
        return true;
    }
}
```



## 子集问题

### [78. 子集 ](https://leetcode.cn/problems/subsets/submissions/391590993/)

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

### [152. 乘积最大子数组 ](https://leetcode.cn/problems/maximum-product-subarray/description/)

```java
// a  记录以 nums[i-1] 结尾的乘积最小值，b 记录以 nums[i-1] 结尾的乘积最大值。
    public int maxProduct(int[] nums) {
        int a=1,b=1;
        int max=Integer.MIN_VALUE;
        for(int i=0;i<nums.length;i++){
            int tempA=a*nums[i];
            int tempB=b*nums[i];
            a=Math.min(nums[i],Math.min(tempA,tempB));
            b=Math.max(nums[i],Math.max(tempB,tempA));
            max=Math.max(max,b);
        }
        return max;
    }
```

## 前缀和问题

### [1. 两数之和 ](https://leetcode.cn/problems/two-sum/)

```java
    public int[] twoSum(int[] nums, int target) {
        int[] res=new int[2];
        Map<Integer,Integer> map=new HashMap();
        for(int i=0;i<nums.length;i++){
            int other=target-nums[i];
            if(map.containsKey(other)){
                res[0]=i;
                res[1]=map.get(other);
                return res;
            }
            map.put(nums[i],i);
        }
        return res;
    }
```



### [454. 四数相加 II ](https://leetcode.cn/problems/4sum-ii/description/)

思路：

1. 一采用分为两组，HashMap 存一组，另一组和 HashMap 进行比对。  
2. 这样的话情况就可以分为三种：
   1. HashMap 存一个数组，如 A。然后计算三个数组之和，如 BCD。时间复杂度为：O(n)+O(n^3)，得到 O(n^3).
   2. HashMap 存三个数组之和，如 ABC。然后计算一个数组，如 D。时间复杂度为：O(n^3)+O(n)，得到 O(n^3).
   3. HashMap存两个数组之和，如AB。然后计算两个数组之和，如 CD。时间复杂度为：O(n^2)+O(n^2)，得到 O(n^2).
3. 根据第二点我们可以得出要存两个数组算两个数组。
4. 我们以存 AB 两数组之和为例。首先求出 A 和 B 任意两数之和 sumAB，以 sumAB 为 key，sumAB 出现的次数为 value，存入 hashmap 中。 然后计算 C 和 D 中任意两数之和的相反数 sumCD，在 hashmap 中查找是否存在 key 为 sumCD。 算法时间复杂度为 O(n2)。

```java
  public int fourSumCount(int[] nums1, int[] nums2, int[] nums3, int[] nums4) {
        Map<Integer,Integer> map1=new HashMap();
        for(int i=0;i<nums1.length;i++){
            for(int j=0;j<nums2.length;j++){
                int sum=nums1[i]+nums2[j];
                map1.put(sum,map1.getOrDefault(sum,0)+1);
            }
        }
        Map<Integer,Integer> map2=new HashMap();
        for(int i=0;i<nums3.length;i++){
            for(int j=0;j<nums4.length;j++){
                int sum=nums3[i]+nums4[j];
                map2.put(sum,map2.getOrDefault(sum,0)+1);
            }
        }
        int res=0;
        for(int key:map1.keySet()){
            int sum1=map1.get(key);
            int sum2=map2.getOrDefault(-key,0);
            res+=sum1*sum2;
        }
        return res;
    }
```





### [560. 和为 K 的子数组 ](https://leetcode.cn/problems/subarray-sum-equals-k/)

<!-- tabs:start -->

**暴力**

```java
    public int subarraySum(int[] nums, int k) {
        int count=0;
        for(int i=0;i<nums.length;i++){
            int sum=0;
            for(int j=i;j<nums.length;j++){
                sum+=nums[j];
                if (sum == k) {
                    count++;
                }
            }
        }
        return count;
    }
```

**前缀和**

```java
// 构建前缀和数组，以快速计算区间和；
// 注意在计算区间和的时候，下标有偏移。 
public int subarraySum(int[] nums, int k) {
        int len=nums.length;
        // len+1目的是会出现第一个数刚好符合的情况
        int[] preSum =new int[len+1];
        for(int i=0;i<len;i++){
            preSum[i+1] = preSum[i] + nums[i]; 
        }
        int count = 0;
        for(int i = 0;i<len;i++){
            for(int j = i;j<len;j++){
                if(preSum[j+1] - preSum[i] == k){
                    count++;
                }
            }
        }
        return count;
    }
```

**前缀和+哈希表优化**

```java
    public int subarraySum(int[] nums, int k) {
        int len=nums.length;
        // len+1目的是会出现第一个数刚好符合的情况
        int[] preSum =new int[len+1];
        for(int i=0;i<len;i++){
            preSum[i+1] = preSum[i] + nums[i]; 
        }
        int count = 0;
        // key 为前缀和，value为前缀和为key的个数，问题转化为和为k的问题
        Map<Integer, Integer> map = new HashMap<>();
        for(int i = 0;i<len+1;i++){
            // 如果有与当前prefixSum[i]的差为k的，则加上它的个数
            count+=map.getOrDefault(preSum[i]-k,0);
            // 统计前缀和的个数
            map.put(preSum[i],map.getOrDefault(preSum[i],0)+1);
        }
        return count;
    }
```



<!-- tabs:end -->

## 滑动窗口问题
### [209. 长度最小的子数组 ](https://leetcode.cn/problems/minimum-size-subarray-sum/solutions/305704/chang-du-zui-xiao-de-zi-shu-zu-by-leetcode-solutio/)

<!-- tabs:start -->

#### **暴力法**

```java
   public int minSubArrayLen(int s, int[] nums) {
        int n = nums.length;
        if (n == 0) {
            return 0;
        }
        int ans = Integer.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            int sum = 0;
            for (int j = i; j < n; j++) {
                sum += nums[j];
                if (sum >= s) {
                    ans = Math.min(ans, j - i + 1);
                    break;
                }
            }
        }
        return ans == Integer.MAX_VALUE ? 0 : ans;
    }
```

#### **滑动窗口**

思路:

```java
  public int minSubArrayLen(int target, int[] nums) {
        int left=0,right=0,len=nums.length;
        int sum=0,max=Integer.MAX_VALUE;
        while(right<len){
            sum+=nums[right];
            while(sum>=target){
                max=Math.min(max,right-left+1);
                sum-=nums[left++];
            }
            right++;
        }
        return max==Integer.MAX_VALUE?0:max;
    }
```



**前缀和 + 二分查找**

<!-- tabs:end -->
## 游戏问题

### [55. 跳跃游戏](https://leetcode.cn/problems/jump-game/submissions/392754854/)

思路:

想象你是那个在格子上行走的小人，格子里面的数字代表“能量”，你需要“能量”才能继续行走。每次走到一个格子的时候，你检查现在格子里面的“能量”和你自己拥有的“能量”哪个更大，取更大的“能量”！ 如果你有更多的能量，你就可以走的更远啦！~

```java
    public boolean canJump(int[] nums) {
        int cur=nums[0];
        int i=1;
        for(;i<nums.length;i++){
            if(cur>0){
                if(--cur<nums[i]){
                    cur=nums[i];
                }
            }else{
                break;
            }
        }
        return i==nums.length;
    }
```

### [面试题61. 扑克牌中的顺子 - 力扣（Leetcode）](https://leetcode.cn/problems/bu-ke-pai-zhong-de-shun-zi-lcof/description/)

思路: 根据题意，此 5 张牌是顺子的 充分条件 如下：

1. 除大小王外，所有牌 无重复 ；
2. 设此 5张牌中最大的牌为 max ，最小的牌为 min （大小王除外），则需满足：
   max−min<5 

```java
    public boolean isStraight(int[] nums) {
        Arrays.sort(nums);
        // 大小王数,通过它可以获取最小值索引
        int count=0;
        for(int i=0;i<nums.length-1;i++){
            if(nums[i]==0)count++;
            else if(nums[i]==nums[i+1])return false;
        }
        return nums[nums.length-1]-nums[count]<5;
    }
```



## 双指针问题

### [349. 两个数组的交集 - 力扣（Leetcode）](https://leetcode.cn/problems/intersection-of-two-arrays/description/)

排序+双指针

```java
  public int[] intersection(int[] nums1, int[] nums2) {
        Arrays.sort(nums1);
        Arrays.sort(nums2);
        int index1=0,index2=0;
        Set<Integer> set=new HashSet();
        while(index1<nums1.length&&index2<nums2.length){
            int num1=nums1[index1],num2=nums2[index2];
            if(num1==num2){

                
            }else if(num1<num2){
                index1++;
            }else{
                index2++;
            }
        }
        List<Integer> list= new ArrayList(set);
        int[] res= new int[list.size()];
        for(int i=0;i<list.size();i++){
            res[i]=list.get(i);
        }
        return res;
    }
```

