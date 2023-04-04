## 贪心算法

### [763. 划分字母区间 - 力扣（Leetcode）](https://leetcode.cn/problems/partition-labels/description/)

[思路](https://leetcode.cn/problems/partition-labels/solutions/455703/hua-fen-zi-mu-qu-jian-by-leetcode-solution/)

```java
    public List<Integer> partitionLabels(String s) {
        int[] last=new int[26];
        int len=s.length();
        for(int i=0;i<len;i++){
            last[s.charAt(i)-'a']=i;
        }
        List<Integer> res=new ArrayList();
        int start=0,end=0;
        for(int i=0;i<len;i++){
            end=Math.max(end,last[s.charAt(i)-'a']);
            if(i==end){
                res.add(end-start+1);
                start=end+1;
            }
        }
        return res;
    }
```

### [12. 整数转罗马数字 - 力扣（Leetcode）](https://leetcode.cn/problems/integer-to-roman/description/)

思路: [12. 整数转罗马数字 - 力扣（Leetcode）](https://leetcode.cn/problems/integer-to-roman/solutions/15339/tan-xin-suan-fa-by-liweiwei1419/)

题目中阿拉伯数组转换成罗马数字的规则如下：

4、9、40、90、400、900 对应的罗马数字字符只出现一次；
其余字符可以连续出现的次数不超过 3 次。
按照贪心的方式，尽可能先选出大的数字进行转换。

#### 贪心

```java
   public String intToRoman(int num) {
  // 把阿拉伯数字与罗马数字可能出现的所有情况和对应关系，放在两个数组中，并且按照阿拉伯数字的大小降序排列
        int[] nums = {1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1};
        String[] romans = {"M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"};
        StringBuffer sb=new StringBuffer();
        int index=0;
        while(index<13){
            while(num>=nums[index]){
                sb.append(romans[index]);
                num-=nums[index];
            }
            index++;
        }
        return sb.toString();

    }
```
