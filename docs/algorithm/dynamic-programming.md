### 股票买卖

121. 买卖股票的最佳时机
122. 买卖股票的最佳时机 II
123. 买卖股票的最佳时机 III
188. 买卖股票的最佳时机 IV
309. 最佳买卖股票时机含冷冻期
714. 买卖股票的最佳时机含手续费

https://leetcode.cn/circle/article/qiAgHn/

### 回文子串



### 接雨水问题

[【Leetcode每日打卡】接雨水问题的超完全手册 (qq.com)](https://mp.weixin.qq.com/s/f9ebzbwymR8jQeUDxjeCDA)

#### [42. 接雨水 - 力扣（Leetcode）](https://leetcode.cn/problems/trapping-rain-water/)

<!-- tabs:start -->

##### **暴力**

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

##### **动态规划**

在上述的暴力法中，对于每个柱子，我们都需要从两头重新遍历一遍求出左右两侧的最大高度，这里是有很多重复计算的，很明显最大高度是可以记忆化的，具体在这里可以用数组边递推边存储，也就是常说的动态规划，DP。

具体做法：

- 定义二维dp数组 int[][] dp = new int[n][2],

  其中，dp[i][0] 表示下标i的柱子左边的最大值，

- dp[i][1] 表示下标i的柱子右边的最大值。

- 分别从两头遍历height数组，为 dp[i][0]和 dp[i][1] 赋值。

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

##### **双指针**

在上述的动态规划方法中，我们用二维数组来存储每个柱子左右两侧的最大高度，但我们递推累加每个柱子的储水高度时其实只用到了 dp[i][0]和 dp[i][1] 两个值，因此我们递推的时候只需要用 int leftMax 和 int rightMax 两个变量就行了。

即将上述代码中的递推公式：

res += Math.min(dp[i][0], dp[i][1]) - height[i];

优化成：

res += Math.min(leftMax, rightMax) - height[i];

注意这里的 leftMax 是从左端开始递推得到的，而 rightMax 是从右端开始递推得到的。

因此遍历每个柱子，累加每个柱子的储水高度时，也需要用 left 和 right 两个指针从两端开始遍历。

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

### 最长/最小问题

#### [300. 最长上升子序列](https://leetcode.cn/problems/longest-increasing-subsequence)

```java
    public int lengthOfLIS(int[] nums) {
        int[] dp=new int[nums.length];
        Arrays.fill(dp,1);
        int max=1;
        for(int i=1;i<nums.length;i++){
            for(int j=0;j<i;j++){
                if(nums[i]>nums[j]){
                    dp[i]=Math.max(dp[i],dp[j]+1);
                    max=Math.max(dp[i],max);
                }
            }
        }
        return max;
    }
```

#### [72. 编辑距离](https://leetcode.cn/problems/edit-distance)

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

