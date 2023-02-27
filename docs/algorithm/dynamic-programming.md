## 股票买卖

### [121. 买卖股票的最佳时机 - 力扣（Leetcode）](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/)

```java
    public int maxProfit(int[] prices) {
        if(prices.length==0){
            return 0;
        }
        // 0代表卖出/休息，1代表买入/休息
        int dp0 = 0;
        int  dp1 = -prices[0];
        for(int i=1;i<prices.length;i++){
            dp0 = Math.max(dp1+prices[i],dp0);
            dp1 = Math.max(-prices[i],dp1);
        }
        return dp0;
    }
```

### [122. 买卖股票的最佳时机 II - 力扣（Leetcode）](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/)

```java
    public int maxProfit(int[] prices) {
            if(prices.length==0){
                return 0;
            }
            // 0代表当天持有0股，1代表当天持有1股
            // int[][] dp=new int[prices.length][2];
            int dp0 = 0;
            int dp1 = -prices[0];
            for(int i=1;i<prices.length;i++){
                int new0 = Math.max(dp1+prices[i],dp0);
                // 只能交易n次 
                dp1 = Math.max(new0-prices[i],dp1);
                dp0=new0;
            }
            return dp0;
    }
```



### [123. 买卖股票的最佳时机 III - 力扣（Leetcode）](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iii/)

```java
public int maxProfit(int[] prices) {
        if(prices.length==0){
            return 0;
        }
        int[][][] dp=new int[prices.length][3][2];
        dp[0][1][0]=0;
        dp[0][1][1]=-prices[0];
        dp[0][2][0]=0;
        dp[0][2][1]=-prices[0];
        for(int i=1;i<prices.length;i++){
            dp[i][2][0] = Math.max(dp[i-1][2][1]+prices[i],dp[i-1][2][0]);
            dp[i][2][1]=Math.max(dp[i-1][2][1],dp[i-1][1][0]-prices[i]);
            dp[i][1][0]=Math.max(dp[i-1][1][0],dp[i-1][1][1]+prices[i]);
            dp[i][1][1]=Math.max(dp[i-1][1][1],dp[i-1][0][0]-prices[i]);
        }
        return dp[prices.length-1][2][0];
    }
```



买卖股票的最佳时机 IV

最佳买卖股票时机含冷冻期

买卖股票的最佳时机含手续费

https://leetcode.cn/circle/article/qiAgHn/

## 回文子串

### [5. 最长回文子串 - 力扣（Leetcode）](https://leetcode.cn/problems/longest-palindromic-substring/)

#### 暴力

```java
  public String longestPalindrome(String s) {
        String max = s.substring(0,1);
        for(int i=0;i<s.length();i++){
            String temp=conut(s,i,i);
            max=temp.length()>max.length()?temp:max;
            temp=conut(s,i,i+1);
            max=temp.length()>max.length()?temp:max;
        }
        return max;
    }

    public String conut(String s, int left,int right){
        // 注意防止空指针end必须等于left
        int start=left,end=left;
        while(left>=0&&right<s.length()&&s.charAt(left)==s.charAt(right)){
            start=left--;
            end=right++;
        }
        return s.substring(start,end+1);
    }
```

#### 动态规划(时间复杂度高)

```java
  public String longestPalindrome(String s) {
        boolean[] dp=new boolean[s.length()];
        String max=s.substring(0,1);
        for(int i=0;i<s.length();i++){
            dp[i]=true;
            for(int j=0;j<i;j++){
                if(s.charAt(j)==s.charAt(i)&&dp[j+1]){
                    dp[j]=true;
                    String temp=s.substring(j,i+1);
                    max=temp.length()>max.length()?temp:max;
                }else{
                    dp[j]=false;
                }
            }
        }
        return max;
    }
```



## 接雨水问题

[【Leetcode每日打卡】接雨水问题的超完全手册 (qq.com)](https://mp.weixin.qq.com/s/f9ebzbwymR8jQeUDxjeCDA)

### [42. 接雨水 ](https://leetcode.cn/problems/trapping-rain-water/)

<!-- tabs:start -->

#### **暴力**

```java
//很明显每个柱子顶部可以储水的高度为：该柱子的左右两侧最大高度的较小者减去此柱子的高度。因此我们只需要遍历每个柱子，累加每个柱子可以储水的高度即可。  
public int trap(int[] height) {
         int res=0;
         for(int i=1;i<height.length;i++){
             int leftMax=0,rightMax=0;
             for(int j=0;j<=i;j++){
                 leftMax=Math.max(leftMax,height[j]);
             }
             for(int j=i;j<height.length;j++){
                 rightMax=Math.max(rightMax,height[j]);
             }
             res+=Math.min(leftMax,rightMax)-height[i];
         }
         return res;
    }
```

#### **动态规划**

在上述的暴力法中，对于每个柱子，我们都需要从两头重新遍历一遍求出左右两侧的最大高度，这里是有很多重复计算的，很明显最大高度是可以记忆化的，具体在这里可以用数组边递推边存储，也就是常说的动态规划，DP。

具体做法：

- 定义二维dp数组 `int[][] dp = new int[n][2]`,其中，`dp[i][0] `表示下标i的柱子左边的最大值，`dp[i][1] `表示下标i的柱子右边的最大值。

- 分别从两头遍历height数组，为 `dp[i][0]`和 `dp[i][1]` 赋值。
- 同方法1，遍历每个柱子，累加每个柱子可以储水的高度。

```java
	public int trap(int[] height) {
        int len=height.length;
        if(len==0){
            return 0;
        }
        int[][] dp=new int[len][2];
        dp[0][0] = height[0];
        dp[len-1][1]=height[len-1];
        for(int i=1;i<len;i++){
            dp[i][0]=Math.max(height[i],dp[i-1][0]);
        }
        for(int i=len-2;i>=0;i--){
            dp[i][1]=Math.max(height[i],dp[i+1][1]);
        }
        int res=0;
        for(int i=1;i<len-1;i++){
            res+=Math.min(dp[i][0],dp[i][1])-height[i];
        }
        return res;
    }
```

#### **双指针**

在上述的动态规划方法中，我们用二维数组来存储每个柱子左右两侧的最大高度，但我们递推累加每个柱子的储水高度时其实只用到了` dp[i][0]`和 `dp[i][1] `两个值，因此我们递推的时候只需要用 leftMax 和 rightMax 两个变量就行了。

即将上述代码中的递推公式：`res += Math.min(dp[i][0], dp[i][1]) - height[i];`

优化成： `res += Math.min(leftMax, rightMax) - height[i];`

注意这里的 leftMax 是从左端开始递推得到的，而 rightMax 是从右端开始递推得到的。因此遍历每个柱子，累加每个柱子的储水高度时，也需要用 left 和 right 两个指针从两端开始遍历。

```java
  public int trap(int[] height) {
        int res = 0, leftMax = 0, rightMax = 0, left = 0, right = height.length - 1;
        while (left <= right) {
            if (leftMax <= rightMax) {
                leftMax = Math.max(leftMax, height[left]);
                res += leftMax - height[left++];
            } else {
                rightMax = Math.max(rightMax, height[right]);
                res += rightMax - height[right--];
            }
        } 
        return res;
    }
```

<!-- tabs:end -->

## 子序列问题

### [300. 最长上升子序列](https://leetcode.cn/problems/longest-increasing-subsequence)

#### 动态规划

思路: 

- 定义dp[i] 为考虑前 iii 个元素，以第 i 个数字结尾的最长上升子序列的长度，注意 nums[i] 必须被选取。

- 我们从小到大计算 dp 数组的值，在计算 dp[i]之前，我们已经计算出 dp[0…i−1]的值，则状态转移方程为：`dp[i]=max⁡(dp[j])+1,其中 0≤j<i 且 num[j]<num[i] `

- 即考虑往 dp[0…i−1] 中最长的上升子序列后面再加一个 nums[i]。由于 dp[j]代表 nums[0…j]中以 nums[j] 结尾的最长上升子序列，所以如果能从 dp[j]这个状态转移过来，那么 nums[i] 必然要大于 nums[j]，才能将 nums[i]放在 nums[j]后面以形成更长的上升子序列。
- 最后，整个数组的最长上升子序列即所有 dp[i]中的最大值。`LISlength=max⁡(dp[i]),其中 0≤i<n `




```java
    public int lengthOfLIS(int[] nums) {
        int[] dp=new int[nums.length];
        Arrays.fill(dp,1);
        int max=1;
        for(int i=1;i<nums.length;i++){
            for(int j=0;j<i;j++){
                if(nums[i]>nums[j]){
                    dp[i]=Math.max(dp[i],dp[j]+1);
                }
            }
            max=Math.max(dp[i],max);
        }
        return max;
    }
```

#### 动态规划 + 二分查找

### [1143. 最长公共子序列 - 力扣（Leetcode）](https://leetcode.cn/problems/longest-common-subsequence/solutions/)

#### 动态规划

```java
    int m = text1.length(), n = text2.length();
          int[][] dp=new int[m+1][n+1];
          for(int i=1;i<=m;i++){
              for(int j=1;j<=n;j++){
                  if(text1.charAt(i-1)==text2.charAt(j-1)){
                      dp[i][j]=dp[i-1][j-1]+1;
                  }
                  dp[i][j]=Math.max(dp[i-1][j],dp[i][j]);
                  dp[i][j]=Math.max(dp[i][j-1],dp[i][j]);
              }
          }
          return dp[m][n];
```



## 编辑距离

### [72. 编辑距离](https://leetcode.cn/problems/edit-distance)

```java
/**
 * 第一步：初始化dp数组 dp[i+1][j+1],长度为i的word1转换成长度为j的word2需要的最少操作数
 *  note： 数组长度必须时i+1，j+1；因为字符串存在为0的情况；
 * 第二步，数组关系，
 * 当word[i]==word[j]时 d[i][j]=d[i-1][j-1];
 * 当word[i]!=word[j]时 有三种操作,取最小:
 * 1.如果把字符 word1[i] 替换成与 word2[j] 相等，则有 dp[i] [j] = dp[i-1] [j-1] + 1;
 * 2.如果在字符串 word1末尾插⼊⼀个与 word2[j] 相等的字符，则有 dp[i] [j] = dp[i] [j-1] + 1;
 * 3.如果把字符 word1[i] 删除，则有 dp[i] [j] = dp[i-1] [j] + 1;
 * 第三步：初始化 d[i][0]=i,d[0][j]=j;
 */ 
public int minDistance(String word1, String word2) {
        int len1=word1.length(),len2=word2.length();
        int[][] dp=new int[len1+1][len2+1];
        for(int i=0;i<=len1;i++){
            dp[i][0]=i;
        }
        for(int i=0;i<=len2;i++){
            dp[0][i]=i;
        }
        for(int i=1;i<=len1;i++){
            for(int j=1;j<=len2;j++){
                if(word1.charAt(i-1)==word2.charAt(j-1)){
                    dp[i][j]=dp[i-1][j-1];
                }else{
                    int min=Math.min(dp[i-1][j],Math.min(dp[i][j-1],dp[i-1][j-1]));
                    dp[i][j]=min+1;
                }
            }
        }
        return dp[len1][len2];
    }
```

## 打家劫舍问题

### [198. 打家劫舍 ](https://leetcode.cn/problems/house-robber/submissions/392381996/)

```java
   public int rob(int[] nums) {
        if(nums.length==1){
            return nums[0];
        }
        int[] dp=new int[nums.length];
        dp[0]=nums[0];
        dp[1]=Math.max(nums[0],nums[1]);
        for(int i=2;i<nums.length;i++){
            dp[i]=Math.max(dp[i-2]+nums[i],dp[i-1]);
        }
        return dp[nums.length-1];
    }
```

### [213. 打家劫舍 II ](https://leetcode.cn/problems/house-robber-ii/submissions/392382785/)

```java
// 要么第一个不偷,要不最后一个不偷
public int rob(int[] nums) {
        if(nums.length==0)return 0;
        if(nums.length==1) return nums[0];
        int a=robOne(Arrays.copyOfRange(nums,0,nums.length-1));
        int b=robOne(Arrays.copyOfRange(nums,1,nums.length));
        return Math.max(a,b);
}
public int robOne(int[] nums) {
    if(nums.length==1){
        return nums[0];
    }
    int[] dp=new int[nums.length];
    dp[0]=nums[0];
    dp[1]=Math.max(nums[0],nums[1]);
    for(int i=2;i<nums.length;i++){
        dp[i]=Math.max(dp[i-2]+nums[i],dp[i-1]);
    }
    return dp[nums.length-1];
}
```

### [337. 打家劫舍 III ](https://leetcode.cn/problems/house-robber-iii/solutions/)

<!-- tabs:start -->

#### **动态规划**

```java
    
// 思路:
// 设置map: f代表选择当前节点 g代表不选择当前节点;
// f的值为 当前节点的值+left g+right g;
// g的值为 Math.max(leftf,leftg)+Math.max(rightg,rightf);
Map<TreeNode,Integer> f=new HashMap();
Map<TreeNode,Integer> g=new HashMap();

    public int rob(TreeNode root) {
        dfs(root);
        return Math.max(f.getOrDefault(root,0),g.getOrDefault(root,0));
    }

    public void dfs(TreeNode root){
        if(root==null){
            return;
        }
        dfs(root.left);
        dfs(root.right);
        f.put(root,root.val+g.getOrDefault(root.left,0)+g.getOrDefault(root.right,0));
        g.put(root,Math.max(f.getOrDefault(root.left,0),g.getOrDefault(root.left,0))            +Math.max(f.getOrDefault(root.right,0),g.getOrDefault(root.right,0)));
    }
```

#### **优化**

```java
public int rob(TreeNode root) {
    int[] rootStatus = dfs(root);
    return Math.max(rootStatus[0], rootStatus[1]);
}

public int[] dfs(TreeNode node) {
    if (node == null) {
        return new int[]{0, 0};
    }
    int[] l = dfs(node.left);
    int[] r = dfs(node.right);
    int selected = node.val + l[1] + r[1];
    int notSelected = Math.max(l[0], l[1]) + Math.max(r[0], r[1]);
    return new int[]{selected, notSelected};
}
```

<!-- tabs:end -->

## 最小/最大路径和

### [120. 三角形最小路径和 - 力扣（Leetcode）](https://leetcode.cn/problems/triangle/)

<!-- tabs:start -->

#### **动态规划**

```java
    // 我们用 dp[i][j]表示从三角形顶部走到位置 (i,j)的最小路径和
    // 状态转移方程 由于每一步只能移动到下一行「相邻的节点」上，因此要想走到位置 (i,j)，上一步就只能在位置 (i−1,j−1)或者位置 (i−1,j)
    // 状态转移方程的边界条件 dp[0][0]=triangle[0][0]
    public int minimumTotal(List<List<Integer>> triangle) {
        int n= triangle.size();
        int[][] dp=new int[n][n];
        dp[0][0]=triangle.get(0).get(0);
        for(int i=1;i<n;i++){
            dp[i][0]=dp[i-1][0]+triangle.get(i).get(0);
            for(int j=1;j<i;j++){
                dp[i][j]=Math.min(dp[i-1][j],dp[i-1][j-1])+triangle.get(i).get(j);
            }
            dp[i][i]=dp[i-1][i-1]+triangle.get(i).get(i);
        }

        // 从最后一行取最小值
        int min=Integer.MAX_VALUE;
        for(int i=0;i<n;i++){
            System.out.println(dp[n-1][i]);
            min=Math.min(min,dp[n-1][i]);
        }
        return min;


    }
```

#### **空间优化**

```java
从最后一层开始算最小路径，然后当前数为最后一层到此的最小路径
 public int minimumTotal(List<List<Integer>> triangle) {
        int n=triangle.size();
        for(int i=n-2;i>=0;i--){
            List<Integer> list=triangle.get(i);
            List<Integer> list1=triangle.get(i+1);
            for(int j=0;j<list.size();j++){
                list.set(j,Math.min(list1.get(j),list1.get(j+1))+list.get(j));
            }
        }
        return triangle.get(0).get(0);
    }
```

## 路径和

### [494. 目标和 - 力扣（Leetcode）](https://leetcode.cn/problems/target-sum/description/)

#### **深度优先**

```java
  int res=0;
    public int findTargetSumWays(int[] nums, int target) {
        findTargetSumWays(nums,0,target);
        return res;
    }

    public void findTargetSumWays(int[] nums,int start,int target){
        if(start==nums.length){
            if(target==0){
                res++;
            }
            return; 
        }
        findTargetSumWays(nums,start+1,target-nums[start]);
        findTargetSumWays(nums,start+1,target+nums[start]);
    }
```

#### **动态规划**

```java
 public int findTargetSumWays(int[] nums, int target) {
         int sum=0;
         for(int num:nums){
            sum+=num;
         }
         // 如果和为奇数或者小于target返回0；
        if((sum+target)%2==1||sum<target){
            return 0;
        }
        int mid = Math.abs((sum+target)/2);
        int[] dp = new int[mid+1];
        dp[0]=1;
        for(int num:nums){
            for(int i=mid;i>=num;i--){
                dp[i]=dp[i-num]+dp[i];
            }
        }
        return dp[mid];
    }
```



## 二叉树问题

```java
思路:
  // 分析：
    // 1. 二叉搜索树的条件是根的左边都小于根，且根的右边都大于根
    // 2. 所以对于一个升序数列1....n来说，构建二叉搜索数
    // 只需要取其中任意一个数i作为根，取这个数左边的数[0,i-1]构建左子树，取这个数右边的数[i+1,n]构建右子树即可
    // 3. 此时左子树本身可能有m种构建方式，右子树有n种构建方式，所以取i作为根的二叉搜索树的种类为m*n
    // 4. 对于整个序列1-n来说，根有1-n种可能，所以整个序列构建二叉搜索树的所有种类为分别取1-n的二叉搜索树的中类的和
    // 
    // 代码归纳：
    // 假设序列为 [1-n]
    // 记k[i]为根取第i个数时的二叉搜索树的种类
    // 记dp[n]为n个数构成的二叉树的种类（种类只和数量有关，例如 【1-5】5个数和【6-10】5个数构建的二叉搜索树种类是一样的 ）
    // 那么k[i]=左侧i-1个数的二叉树的种类dp[i-1]*右侧n-i个数的二叉树的种类dp[n-i]
    // 即k[i] = dp[i-1]*dp[n-i] (挑选i作为根，剩余左侧和右侧的子树种类乘积)
    // 所以dp[n] = k[1]          +  k[2]............. + k[n-1]        + k[n]
    //          = dp[0]*dp[n-1] + dp[1]*dp[n-2]...... + dp[n-2]*dp[1] + dp[n-1]*dp[0]
    //     （解释：选第1个数时，左侧数为0个，右侧数为n-1个；选第n个数时，左侧数为n-1个，右侧数为0个）
    // 特殊边界：dp[0]为0个数构成的二叉搜索树种类为1，因为null可以认为是一颗空的二叉搜索树

class Solution {
    public int numTrees(int n) {
        int[] dp=new int[n+1];
        dp[0]=1;
        dp[1]=1;
        for(int i=2;i<=n;i++){
            for(int j=0;j<i;j++){
                dp[i]+=dp[j]*dp[i-j-1];
            }
        }
        return dp[n];
    }
}
```

## 不同路径

### [63. 不同路径 II - 力扣（Leetcode）](https://leetcode.cn/problems/unique-paths-ii/submissions/394526301/)

```java
public int uniquePathsWithObstacles(int[][] obstacleGrid) {
        int m=obstacleGrid.length,n=obstacleGrid[0].length;
        int[][] dp=new int[m][n];
         if(obstacleGrid[0][0]==0)dp[0][0]=1;
        for(int i=1;i<m;i++){
            dp[i][0]=obstacleGrid[i][0]==1?0:dp[i-1][0];
        }
        for(int i=1;i<n;i++){
            dp[0][i]=obstacleGrid[0][i]==1?0:dp[0][i-1];
        }
        for(int i=1;i<m;i++){
            for(int j=1;j<n;j++){
                dp[i][j]=obstacleGrid[i][j]==0?dp[i-1][j]+dp[i][j-1]:0;
            }
        }
        return dp[m-1][n-1];
    }
```

## 连续数组和最大问题

### [53. 最大子数组和 - 力扣（Leetcode）](https://leetcode.cn/problems/maximum-subarray/)

#### 动态规划

```java
    public int maxSubArray(int[] nums) {
        int[] dp=new int[nums.length];
        dp[0]=nums[0];
        int res=dp[0];
        for(int i=1;i<nums.length;i++){
            dp[i] = Math.max(dp[i-1]+nums[i],nums[i]);
            res=Math.max(dp[i],res);
        }
        return res;
    }
```

#### 优化

```java
    public int maxSubArray(int[] nums) {
        int res=nums[0];
        int sum=nums[0];
        for(int i=1;i<nums.length;i++){
            sum=Math.max(sum+nums[i],nums[i]);
            res=Math.max(sum,res);
        }
        return res;
    }
```

## 零钱兑换问题

### [322. 零钱兑换 - 力扣（Leetcode）](https://leetcode.cn/problems/coin-change/solutions/)

### 动态规划

```java
public int coinChange(int[] coins, int amount) {
        int[] dp=new int[amount+1];
        Arrays.fill(dp,Integer.MAX_VALUE);
        dp[0]=0;
        for(int coin:coins){
            for(int i=coin;i<=amount;i++){   
                  // 只有dp[j-coins[i]]不是初始最大值时,该位才有选择的必要
                if(dp[i-coin]!=Integer.MAX_VALUE){
                    dp[i]=Math.min(dp[i],dp[i-coin]+1);
                }
            }
        }
        return dp[amount]==Integer.MAX_VALUE?-1:dp[amount];
    }
```

### [518. 零钱兑换 II - 力扣（Leetcode）](https://leetcode.cn/problems/coin-change-ii/submissions/405699715/)

#### 动态规划

```java
    public int change(int amount, int[] coins) {
        int[] dp=new int[amount+1];
        dp[0]=1;
        for(int coin:coins){
            for(int i=coin;i<=amount;i++){
                dp[i]+=dp[i-coin];
            }
        }
        return dp[amount];
    }
```



### [221. 最大正方形 - 力扣（Leetcode）](https://leetcode.cn/problems/maximal-square/)

```java
 public int maximalSquare(char[][] matrix) {
        int m=matrix.length,n=matrix[0].length;
        int[][] dp = new int[m][n];
        int max=0;
        for(int i=0;i<m;i++){
            dp[i][0] = matrix[i][0] == '0' ? 0 : 1;
            max=Math.max(dp[i][0],max);
        }
        for(int i=0;i<n;i++){
            dp[0][i] = matrix[0][i] == '0' ? 0 : 1;
            max=Math.max(dp[0][i],max);
        }        
        for(int i=1;i<m;i++){
            for(int j=1;j<n;j++){
                if(matrix[i][j]=='1'){
                    dp[i][j]=1+Math.min(dp[i-1][j-1],Math.min(dp[i-1][j],dp[i][j-1]));
                    max=Math.max(dp[i][j],max);
                }
            }
        }
        return max*max;
    }
```

### [718. 最长重复子数组 - 力扣（Leetcode）](https://leetcode.cn/problems/maximum-length-of-repeated-subarray/solutions/)

#### 动态规划

```java
 public int findLength(int[] nums1, int[] nums2) {
        int len=nums1.length,len1=nums2.length;
        int[][] dp=new int[len+1][len1+1];
        int max=0;
        for(int i=1;i<=len;i++){
            for(int j=1;j<=len1;j++){
                if(nums1[i-1]==nums2[j-1]){
                    dp[i][j]=dp[i-1][j-1]+1;
                }
                max=Math.max(max,dp[i][j]);
            }
        }
        return max;
    }
```

#### 滑动窗口

```java
    public int findLength(int[] A, int[] B) {
        int n = A.length, m = B.length;
        int ret = 0;
        for (int i = 0; i < n; i++) {
            int len = Math.min(m, n - i);
            int maxlen = maxLength(A, B, i, 0, len);
            ret = Math.max(ret, maxlen);
        }
        for (int i = 0; i < m; i++) {
            int len = Math.min(n, m - i);
            int maxlen = maxLength(A, B, 0, i, len);
            ret = Math.max(ret, maxlen);
        }
        return ret;
    }

    public int maxLength(int[] A, int[] B, int addA, int addB, int len) {
        int ret = 0, k = 0;
        for (int i = 0; i < len; i++) {
            if (A[addA + i] == B[addB + i]) {
                k++;
            } else {
                k = 0;
            }
            ret = Math.max(ret, k);
        }
        return ret;
    }
```

## 背包问题

求解顺序的完全背包问题时，对物品的迭代应该放在最里层，对背包的迭代放在外层，只有这样才能让物品按一定顺序放入背包中。

### [139. 单词拆分 - 力扣（Leetcode）](https://leetcode.cn/problems/word-break/solutions/)

#### 动态规划

我们定义 dp[i] 表示字符串 s 前 i 个字符组成的字符串 s[0..i−1]是否能被空格拆分成若干个字典中出现的单词

```java
//这里放你的代码
 public boolean wordBreak(String s, List<String> wordDict) {
        boolean[] dp=new boolean[s.length()+1];
        dp[0]=true;
        for(int i=1;i<=s.length();i++){
            for(String word:wordDict){ // 对物品的迭代应该放在最里层
                if(i>=word.length() &&word.equals(s.substring(i-word.length(),i))){
                    dp[i]=dp[i]||dp[i-word.length()];
                }
            }
        }
        return dp[s.length()];
    }
```

### [字节跳动高频题——圆环回原点问题 (qq.com)](https://mp.weixin.qq.com/s/NZPaFsFrTybO3K3s7p7EVg)
