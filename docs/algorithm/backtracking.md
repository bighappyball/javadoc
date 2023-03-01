# 回溯

## 全排列

看到 全排列，或者 枚举全部解，等类似的 搜索枚举类型题，基本就是 回溯 没跑了。 因为回溯就是类似枚举的搜索尝试过程，主要是在搜索尝试过程中寻找问题的解，当发现已不满足求解条件时，就“回溯”返回，尝试别的路径。

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

### [46. 全排列 - 力扣（Leetcode）](https://leetcode.cn/problems/permutations/description/)

思路: 增加used数组判断是否使用过

```java

    List<List<Integer>> res=new ArrayList();

    public List<List<Integer>> permute(int[] nums) {
        boolean[] used = new boolean[nums.length];
        back(nums,new ArrayList(),used);
        return res;

    }

    public void back(int[] nums,List<Integer> list , boolean[] used){
        if(list.size()==nums.length){
            res.add(new ArrayList(list));
            return;
        }
        for(int i=0;i<nums.length;i++){
            if(!used[i]){
                list.add(nums[i]);
                used[i] = true;
                back(nums,list,used);
                used[i] = false;
                list.remove(list.size()-1);
            }
        }
    }
```



### [47. 全排列 II](https://leetcode.cn/problems/permutations-ii/)

#### 回溯+剪枝

思路:   假设我们有 3 个重复数排完序后相邻，那么我们一定保证每次都是拿从左往右第一个未被填过的数字，即整个数组的状态其实是保证了 [未填入，未填入，未填入] 到 [填入，未填入，未填入]，再到 [填入，填入，未填入]，最后到 [填入，填入，填入]的过程的，因此可以达到去重的目标。

因此剪枝条件 `used[i] || (i > 0 && nums[i] == nums[i - 1] && !used[i - 1])`

```java
    List<List<Integer>> res=new ArrayList();

    public List<List<Integer>> permuteUnique(int[] nums) {
        boolean[] used = new boolean[nums.length];
        Arrays.sort(nums);
        back(nums,new ArrayList(),used);
        return res;
    }

    public void back(int[] nums,List<Integer> list,boolean[] used){
        if(list.size()==nums.length){
            res.add(new ArrayList(list));
            return;
        }
        for(int i=0;i<nums.length;i++){
            if(used[i] || (i > 0 && nums[i] == nums[i - 1] && !used[i - 1])){
                continue;
            }
            list.add(nums[i]);
            used[i] = true;
            back(nums,list,used);
            used[i] = false;
            list.remove(list.size()-1);
        }
    }
```



### [22. 括号生成 ](https://leetcode.cn/problems/generate-parentheses/submissions/391200454/)

#### 回溯+剪枝

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

### [39. 组合总和 - 力扣（Leetcode）](https://leetcode.cn/problems/combination-sum/description/)

```java
List<List<Integer>> res=new ArrayList();
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        dfs(candidates,new ArrayList(),target,0);
        return res;
    }

    public void dfs(int[] candidates,List<Integer> list, int target,int start){
        if(target==0){
            res.add(new ArrayList(list));
        }
        if(start>candidates.length||target < 0){
            return;
        }
        for(int i=start;i<candidates.length;i++){
            list.add(candidates[i]);
            dfs(candidates,list,target-candidates[i],i);
            list.remove(list.size()-1);
        }
    }

```



### [40. 组合总和 II](https://leetcode.cn/problems/combination-sum-ii/submissions/392751218/)

#### 回溯+剪枝

```java
 List<List<Integer>> res=new ArrayList();
    public List<List<Integer>> combinationSum2(int[] candidates, int target) {
        Arrays.sort(candidates);
        dfs(candidates,target,0,new ArrayList());
        return res;
    }

    public void dfs(int[] candidates,int target,int start,List<Integer> list){
        if(target==0){
            res.add(new ArrayList(list));
            return;
        }
        for(int i=start;i<candidates.length&&target>=candidates[i];i++){
            if (i > start && candidates[i] == candidates[i - 1]) continue;
            list.add(candidates[i]);
            dfs(candidates,target-candidates[i],i+1,list);
            list.remove(list.size()-1);
        }
    }
```

### [17. 电话号码的字母组合 - 力扣（Leetcode）](https://leetcode.cn/problems/letter-combinations-of-a-phone-number/description/)

#### 回溯+剪枝

```java
 public List<String> letterCombinations(String digits) {
        List<String> combinations = new ArrayList<String>();
        if (digits.length() == 0) {
            return combinations;
        }
        Map<Character, String> phoneMap = new HashMap<Character, String>() {{
            put('2', "abc");
            put('3', "def");
            put('4', "ghi");
            put('5', "jkl");
            put('6', "mno");
            put('7', "pqrs");
            put('8', "tuv");
            put('9', "wxyz");
        }};
        backtrack(combinations, phoneMap, digits, 0, new StringBuffer());
        return combinations;
    }

    public void backtrack(List<String> combinations,Map<Character,String> phoneMap,String digits,int index,StringBuffer combination){
        if(index==digits.length()){
            combinations.add(combination.toString());
        }else{
            char digit=digits.charAt(index);
            String letters=phoneMap.get(digit);
            for(int i=0;i<letters.length();i++){
                combination.append(letters.charAt(i));
                backtrack(combinations,phoneMap,digits,index+1,combination);
                combination.deleteCharAt(index);
            }
        }
    }
```

### [79. 单词搜索 - 力扣（Leetcode）](https://leetcode.cn/problems/word-search/submissions/405204944/)

#### 回溯

```java
public boolean exist(char[][] board, String word) {
        int m=board.length,n=board[0].length;
        for(int i=0;i<m;i++){
            for(int j=0;j<n;j++){
                if(dfs(board,word,0,i,j)){
                    return true;
                }
            }
        }
        return false;
    }

    public boolean dfs(char[][] board, String word,int index,int x,int y){
        if(x<0||x>=board.length||y<0||y>=board[0].length||board[x][y]=='.'||board[x][y]!=word.charAt(index)){
            return false;
        }
        if(index==word.length()-1){
            return true;
        }
        char temp=board[x][y];
        board[x][y]='.';
        boolean b=dfs(board,word,index+1,x,y+1)||dfs(board,word,index+1,x+1,y)||dfs(board,word,index+1,x-1,y)||dfs(board,word,index+1,x,y-1);
        board[x][y]=temp;
        return b;
    }
```

## 记忆化深度优先搜索

### [329. 矩阵中的最长递增路径 - 力扣（Leetcode）](https://leetcode.cn/problems/longest-increasing-path-in-a-matrix/solutions/)

#### 记忆化深度优先搜索

使用记忆化深度优先搜索，当访问到一个单元格 (i,j) 时，如果 `memo[i][j]=0`，说明该单元格的结果已经计算过，则直接从缓存中读取结果，如果` memo[i][j]=0`，说明该单元格的结果尚未被计算过，则进行搜索，并将计算得到的结果存入缓存中。

```java
class Solution {
    public int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    public int rows, columns;

    public int longestIncreasingPath(int[][] matrix) {
        if (matrix == null || matrix.length == 0 || matrix[0].length == 0) {
            return 0;
        }
        rows = matrix.length;
        columns = matrix[0].length;
        int[][] memo = new int[rows][columns];
        int ans = 0;
        for (int i = 0; i < rows; ++i) {
            for (int j = 0; j < columns; ++j) {
                ans = Math.max(ans, dfs(matrix, i, j, memo));
            }
        }
        return ans;
    }

    public int dfs(int[][] matrix, int row, int column, int[][] memo) {
        if (memo[row][column] != 0) {
            return memo[row][column];
        }
        ++memo[row][column];
        for (int[] dir : dirs) {
            int newRow = row + dir[0], newColumn = column + dir[1];
            if (newRow >= 0 && newRow < rows && newColumn >= 0 && newColumn < columns && matrix[newRow][newColumn] > matrix[row][column]) {
                memo[row][column] = Math.max(memo[row][column], dfs(matrix, newRow, newColumn, memo) + 1);
            }
        }
        return memo[row][column];
    }
}
```

#### 拓扑排序

