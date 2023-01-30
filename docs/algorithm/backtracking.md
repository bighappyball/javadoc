## 回溯

看到 全排列，或者 枚举全部解，等类似的 搜索枚举类型题，基本就是 回溯 没跑了。 因为回溯就是类似枚举的搜索尝试过程，主要是在搜索尝试过程中寻找问题的解，当发现已不满足求解条件时，就“回溯”返回，尝试别的路径。

### 全排列

[46. 全排列](https://leetcode.cn/problems/permutations/description/)

[47. 全排列 II](https://leetcode.cn/problems/permutations-ii/)

### 剪枝

#### [40. 组合总和 II](https://leetcode.cn/problems/combination-sum-ii/submissions/392751218/)
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

#### [17. 电话号码的字母组合 - 力扣（Leetcode）](https://leetcode.cn/problems/letter-combinations-of-a-phone-number/description/)

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



