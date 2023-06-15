## 算法分类

比较类排序：通过比较来决定元素间的相对次序，由于其时间复杂度不能突破O(nlogn)，因此也称为非线性时间比较类排序。  

非比较类排序：不通过比较来决定元素间的相对次序，它可以突破基于比较排序的时间下界，以线性时间运行，因此也称为线性时间非比较类排序。  

![alt 排序算法分类](C:/Windows/_media/argorithm/sort/849589-20190306165258970-1789860540.png)  

### 算法复杂度

![alt 排序算法分类](C:/Windows/_media/argorithm/sort/849589-20180402133438219-1946132192.png) 

### 相关概念

1. 稳定：如果a原本在b前面，而a=b，排序之后a仍然在b的前面。
2. 不稳定：如果a原本在b的前面，而a=b，排序之后 a 可能会出现在 b 的后面。
3. 时间复杂度：对排序数据的总的操作次数。反映当n变化时，操作次数呈现什么规律。
4. 空间复杂度：是指算法在计算机

### 冒泡排序（Bubble Sort）

冒泡排序是一种简单的排序算法。它重复地走访过要排序的数列，一次比较两个元素，如果它们的顺序错误就把它们交换过来。走访数列的工作是重复地进行直到没有再需要交换，也就是说该数列已经排序完成。这个算法的名字由来是因为越小的元素会经由交换慢慢“浮”到数列的顶端。 

时间平均n2  时间最坏n2  时间最好n 空间 1  稳定

![alt 冒泡排序](C:/Windows/_media/argorithm/sort/849589-20171015223238449-2146169197.gif) 

```java
    public static void bubbleSort(int[] nums) {
        int n=nums.length;
        for (int i=n-1;i>0;i--) {
            for(int j=0;j<i;j++){
                if (nums[j] > nums[j + 1]) {
                    int temp = nums[j];
                    nums[j] = nums[j + 1];
                    nums[j + 1] = temp;
                }
            }
        }
    }
```

### 选择排序（Selection Sort）

选择排序(Selection-sort)是一种简单直观的排序算法。它的工作原理：首先在未排序序列中找到最小（大）元素，存放到排序序列的起始位置，然后，再从剩余未排序元素中继续寻找最小（大）元素，然后放到已排序序列的末尾。以此类推，直到所有元素均排序完毕。  

时间平均n2  时间最坏n2  时间最好n2 空间 1  不稳定

![alt 选择排序](C:/Windows/_media/argorithm/sort/849589-20171015224719590-1433219824.gif) 

```java
    public static void bubbleSort(int[] nums) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i; j < nums.length; j++) {
                if (nums[i] > nums[j]) {
                    int temp = nums[j];
                    nums[j] = nums[i];
                    nums[i] = temp;
                }
            }
        }
    }
```

### 插入排序（Insertion Sort）

插入排序（Insertion-Sort）的算法描述是一种简单直观的排序算法。它的工作原理是通过构建有序序列，对于未排序数据，在已排序序列中从后向前扫描，找到相应位置并插入。

时间平均n2  时间最坏n2  时间最好n 空间 1  稳定

![alt 插入排序](C:/Windows/_media/argorithm/sort/849589-20171015225645277-1151100000.gif) 


1. 从第一个元素开始，该元素可以认为已经被排序；
2. 取出下一个元素，在已经排序的元素序列中从后向前扫描；
3. 如果该元素（已排序）大于新元素，将该元素移到下一位置；
4. 重复步骤3，直到找到已排序的元素小于或者等于新元素的位置；
5. 将新元素插入到该位置后；
6. 重复步骤2~5。

```java
    public static void insertSort(int[] nums) {
        for (int i = 1; i < nums.length; i++) {
            int pre = i - 1;
            int cur = nums[i];
            while (nums[pre] > cur && pre >= 0) {
                nums[pre + 1] = nums[pre];
                pre--;
            }
            nums[pre + 1] = cur;
        }
    }
```

### 希尔排序（Shell Sort）

1959年Shell发明，第一个突破O(n2)的排序算法，是简单插入排序的改进版。它与插入排序的不同之处在于，它会优先比较距离较远的元素。希尔排序又叫缩小增量排序。

时间平均n1.3  时间最坏n2  时间最好n 空间 1  稳定

![alt 希尔排序](C:/Windows/_media/argorithm/sort/849589-20180331170017421-364506073.gif) 

```java
    public static void shellSort(int[] nums) {
        int len = nums.length;
        for (int i = Math.floorDiv(len, 2); i > 0; i = Math.floorDiv(len, 2)) {
            for (int j = i; j < len; j++) {
                int pre = j;
                int cur = nums[j];
                while (pre - i >= 0 && cur < nums[pre - i]) {
                    nums[pre] = nums[pre - i];
                    pre = pre - i;
                }
                nums[pre] = cur;
            }
        }
    }
```

### 归并排序（Merge Sort）

归并排序是建立在归并操作上的一种有效的排序算法。该算法是采用分治法（Divide and Conquer）的一个非常典型的应用。将已有序的子序列合并，得到完全有序的序列；即先使每个子序列有序，再使子序列段间有序。若将两个有序表合并成一个有序表，称为2-路归并。 

时间平均n*log2n  时间最坏n*log2n  时间最好n*log2n 空间 n  稳定

![alt 归并排序](C:/Windows/_media/argorithm/sort/849589-20171015230557043-37375010.gif) 

```java
    public static int[] mergeSort(int[] nums) {
        int len = nums.length;
        if (len < 2) {
            return nums;
        }
        int middle = Math.floorDiv(len, 2);
        int[] num1 = new int[middle];
        for (int i = 0; i < num1.length; i++) {
            num1[i] = nums[i];
        }
        int[] num2 = new int[len - middle];
        for (int i = 0; i < num2.length; i++) {
            num2[i] = nums[i + middle];
        }
        return merge(mergeSort(num1), mergeSort(num2));
    }

    public static int[] merge(int[] nums1, int[] num2) {
        int len = num2.length + nums1.length;
        int[] nums = new int[len];
        int i = 0, left = 0, right = 0;
        while (i < len && left < nums1.length && right < num2.length) {
            if (nums1[left] < num2[right]) {
                nums[i++] = nums1[left++];
            } else {
                nums[i++] = num2[right++];
            }
        }
        while (left < nums1.length) {
            nums[i++] = nums1[left++];
        }
        while (right < num2.length) {
            nums[i++] = num2[right++];
        }
        return nums;
    }
```


### 快速排序（Quick Sort）

快速排序的基本思想：通过一趟排序将待排记录分隔成独立的两部分，其中一部分记录的关键字均比另一部分的关键字小，则可分别对这两部分记录继续进行排序，以达到整个序列有序。

时间平均n*log2n  时间最坏n2  时间最好n*log2n 空间 n*log2n   不稳定

算法描述  

快速排序使用分治法来把一个串（list）分为两个子串（sub-lists）。具体算法描述如下：  

1. 从数列中挑出一个元素，称为 “基准”（pivot）；
2. 重新排序数列，所有元素比基准值小的摆放在基准前面，所有元素比基准值大的摆在基准的后面（相同的数可以到任一边）。在这个分区退出之后，该基准就处于数列的中间位置。这个称为分区（partition）操作；
3. 递归地（recursive）把小于基准值元素的子数列和大于基准值元素的子数列排序。

#### 快速

```java
    public static void quickSort(int[] nums, int left, int right) {
        if (left < right) {
            int pivot = pivot(nums, left, right);
            quickSort(nums, left, pivot - 1);
            quickSort(nums, pivot + 1, right);
        }
    }

   private static int selectionKey(int[] array, int start, int end){
        //先设置为第一个元素
        int key = array[start];
        //[start,j]是<key的区域
        int j = start;
        //[j+1,i]是>key的区域
        int i = start+1;
        while(i <= end){
            //大于key不动 小于key跟array[j]交换
            if(array[i] <key){
                swap(array,j+1,i);
                j++;
            }
            i++;
        }
        //当遍历完之后把key放在j处 也就是最终位置处
       swap(array,start,j);
       return j;
    }


    // public static int pivot(int[] nums, int left, int right) {
    //    int pivot = left;
    //    int index = pivot + 1;
    //    for (int i = index; i <= right; i++) {
    //        if (nums[i] < nums[pivot]) {
    //            swap(nums, i, index++);
     //       }
    //    }
      //  swap(nums, pivot, index - 1);
   //     return index - 1;
   // }
```

存在优化

- 1.当数组中元素基本上有序，每次取得第一个元素都是最大或最小值，会导致元素左右个数分布不不均匀，当完全有序时近似于一个O（n^2）的排序。

  解决：随机选取val值，在与第一个元素交换，让递归顺利进行。

- 2.当数组中存在大量重复元素，无论是小于等于交换，还是小于交换，都会导致一边区域数据远大于另一半，当重复量很大时近似于一个O（n^2）的排序。

  解决：运用双路快排，把等于val的大量元素均匀的分在两个区域里。****

#### 二路快排

思想
把等于val的元素均匀分布在小于、大于区域内。

代码实现

- 1.避免数组近乎有序，先随机取出一个val，和第一个元素交换。
- 2.定义两个指针，i从头开始指向小于val的区域后一个元素，j从尾开始指向大于val的第一个元素。
- 3.当i所指向的值小于等于val，i++，否则暂停。当j所指向的值大于等于val，j--，否则暂停。当i和j都暂停时，交换i和j所指位置的元素。直到i>j结束，让start赋给j所指向的位置，返回j。
- 4.重复2.3直到start>end，排序完成。

```java
  public int[] sortArray(int[] nums) {
        if(nums.length<=1){
            return nums;
        }
        sortArray(nums,0,nums.length-1);
        return nums;
    }

    public void sortArray(int[] nums,int start,int end){
        if(start >end) return;
        int key = selectKey(nums,start,end);
        sortArray(nums,start,key-1);
        sortArray(nums,key+1,end);
    }

    public int selectKey(int[] nums,int start,int end){
        int random=(int)Math.random()*(end-start+1)+start;
        swap(nums,random,start);
        //找到一个随机key
        int value = nums[start];
        //从头开始往后[start+1,i-1]
        int i = start+1;
        //从尾开始往前[j+1,end]
        int j = end;
        while(true){
            //相当于把等于key的值均分到两边
            while (i<=end && nums [i] <value ) i++;
            while (j>=start+1 &&nums [j] >value ) j--;
            //交换后两个指针都移动一步
            if(i>j) break;
            swap(nums,i,j);
            i++;j--;
        }
        swap(nums,start,j);
        return j;

    }

    public void swap(int[] nums,int i,int j){
        int temp=nums[i];
        nums[i]=nums[j];
        nums[j]=temp;
    }
```

存在优化:

1.当数组重复元素过多时，每次比较==val的元素会浪费时间，虽浪费的时间不足一提，但是还是可以优化的。

解决：三路快排，把等于value的元素放在另一个区间内，不参与下次的排序。

#### 三路快排

思想
在二路排序的基础上，把等于value的元素放在另一个区间内，不参与下次的排序。

代码实现

- 1.避免数组近乎有序，先随机取出一个val，和第一个元素交换。
- 2.定义三个指针，lt从头开始指向小于val的区域后一个元素lt = start-1，i指向目前比较的元素i= start，gt从尾开始指向大于val的第一个元素gt = end+1。保证一开始都是空集合。

- 3.当i所指向的值小于等于val，swap（i，lt+1），lt++。当i所指向的值大于等于val，swap（i，gt-1）gt--，否则i++。直到i>=gt排序完成。将start和lt交换。

- 4.[start,lt-1]和[gt,end]重复2.3直到start>end，排序完成。

```java
  public static void qiuckSort3(int[] array){
        if(array.length <=1)return;
        int start = 0;int end = array.length-1;
        qiuck3(array,start,end);
    }
    private static void qiuck3(int[] array ,int start, int end){
        if(start >end) return;
        if(end - start <=15){
            //如果数据量少就使用直接插入
            insert(array,start,end);
            return;
        }
 
        int random = (int)(Math.random()*(end-start+1)+start);
        swap(array,random,start);
        //找到一个随机key
        int value = array[start];
        int lt = start; int gt = end+1; int i = start+1;
        for(;i<gt;i++){
            if(array[i]<value){
                //放到小于的区域
                swap(array,lt+1,i);
                lt++;i++;
            }else if(array[i]>value){
                //放到大于区域
                swap(array,gt-1,i);
                gt--;
            }
        }
        swap(array,lt,start);
        // 直接跳过相等元素的比较
        qiuck3(array,start,lt-1);
        qiuck3(array,gt,end);
    }
```



### 堆排序（Heap Sort）

堆排序（Heapsort）是指利用堆这种数据结构所设计的一种排序算法。堆积是一个近似完全二叉树的结构，并同时满足堆积的性质：即子结点的键值或索引总是小于（或者大于）它的父节点。

时间平均n*log2n  时间最坏n*log2n  时间最好n*log2n 空间 1   不稳定

1. 将初始待排序关键字序列(R1,R2….Rn)构建成大顶堆，此堆为初始的无序区；
2. 将堆顶元素R[1]与最后一个元素R[n]交换，此时得到新的无序区(R1,R2,……Rn-1)和新的有序区(Rn),且满足R[1,2…n-1]<=R[n]；
3. 由于交换后新的堆顶R[1]可能违反堆的性质，因此需要对当前无序区(R1,R2,……Rn-1)调整为新堆，然后再次将R[1]与无序区最后一个元素交换，得到新的无序区(R1,R2….Rn-2)和新的有序区(Rn-1,Rn)。不断重复此过程直到有序区的元素个数为n-1，则整个排序过程完成。

![alt 堆排序](C:/Windows/_media/argorithm/sort/849589-20171015231308699-356134237.gif) 

## **拓扑排序**

用有向图描述依赖关系
示例：n = 6，先决条件表：[[3, 0], [3, 1], [4, 1], [4, 2], [5, 3], [5, 4]]
课 0, 1, 2 没有先修课，可以直接选。其余的课，都有两门先修课。
我们用有向图来展现这种依赖关系（做事情的先后关系）：

![微信截图_20200517052852.png](C:/Windows/_media/analysis/netty/de601db5bd50985014c7a6b89bca8aa231614b4ba423620dd2e31993c75a9137-微信截图_20200517052852.png)这种叫 有向无环图，把一个 有向无环图 转成 线性的排序 就叫 拓扑排序。
有向图有 入度 和 出度 的概念：
如果存在一条有向边 A --> B，则这条边给 A 增加了 1 个出度，给 B 增加了 1 个入度。
所以，顶点 0、1、2 的入度为 0。顶点 3、4、5 的入度为 2。



## 题目

### [215. 数组中的第K个最大元素 - 力扣（Leetcode）](https://leetcode.cn/problems/kth-largest-element-in-an-array/description/)

#### 快速排序

```java
public int findKthLargest(int[] nums, int k) {
       sort(nums,0,nums.length-1,k-1);
       return nums[k-1];
    }

    public void sort(int[] nums,int start,int end,int k){
        if(start<end){
            int pivot = selectKey(nums, start, end);
            if(pivot>k){
                sort(nums, start, pivot - 1,k);
            }else if(pivot < k){
                sort(nums, pivot + 1, end,k);
            }
        }
    }
    public int selectKey(int[] nums,int start,int end){
        int key = nums[start];
        int j = start;
        int i = start+1;
        while(i<=end){
            if(nums[i]>key){
                swap(nums,i,j+1);
                j++;
            }
            i++;
        }
        swap(nums,start,j);
        return j;
    }
    
    public void swap(int[] nums,int i,int j){
        int temp=nums[i];
        nums[i]=nums[j];
        nums[j]=temp;
    }
```

### [56. 合并区间 - 力扣（Leetcode）](https://leetcode.cn/problems/merge-intervals/)

```java
   public int[][] merge(int[][] intervals) {
        if (intervals.length == 0) {
            return new int[0][2];
        }
        Arrays.sort(intervals,new Comparator<int[]>(){
            public int compare(int[] intervals1,int[] intervals2){
                return intervals1[0]-intervals2[0];
            }
        });
        List<int[]> merged=new ArrayList<int[]>();
        for(int i=0;i<intervals.length;++i){
            int L=intervals[i][0],R=intervals[i][1];
            if(merged.size()==0||merged.get(merged.size()-1)[1]<L){
                merged.add(new int[]{L,R});
            }else{
                merged.get(merged.size()-1)[1]=Math.max(merged.get(merged.size() - 1)[1], R);
            }
        }
        return merged.toArray(new int[merged.size()][]);
    }
```



### [207. 课程表 - 力扣（Leetcode）](https://leetcode.cn/problems/course-schedule/solutions/250377/bao-mu-shi-ti-jie-shou-ba-shou-da-tong-tuo-bu-pai-/)

#### 拓扑排序

```java
 public boolean canFinish(int numCourses, int[][] prerequisites) {
        // 入度数组
        int[] res = new int[numCourses];
        // 邻接表
        Map<Integer,List<Integer>> map=new HashMap();
        for(int i=0;i<prerequisites.length;i++){
            int a=prerequisites[i][0],b=prerequisites[i][1];
            // 求课的初始入度值
            res[a]++;
            // 当前课已经存在于邻接表
            List<Integer> list=map.get(b);
            if(list==null){
                list=new ArrayList();
            }
            list.add(prerequisites[i][0]);
            map.put(b,list);
        }
        Deque<Integer> queue = new LinkedList();
        // 所有入度为0的课入列
        for (int i = 0; i < res.length; i++) { 
            if (res[i] == 0) queue.add(i);
        }
        int count = 0;
        while (!queue.isEmpty()) {
            int selected = queue.poll();           // 当前选的课，出列
            count++;                                  // 选课数+1
            List<Integer> toEnQueue = map.get(selected);   // 获取这门课对应的后续课
            if (toEnQueue!=null&&toEnQueue.size()>0 ) {      // 确实有后续课
                for (int i = 0; i < toEnQueue.size(); i++) {
                    res[toEnQueue.get(i)]--;             // 依赖它的后续课的入度-1
                    if (res[toEnQueue.get(i)] == 0) {    // 如果因此减为0，入列
                        queue.add(toEnQueue.get(i));
                    }
                }
            }
        }
        return count == numCourses; // 选了的课等于总课数，true，否则false
    }
```

### [补充题：检测循环依赖 (qq.com)](https://mp.weixin.qq.com/s/pCRscwKqQdYYN7M1Sia7xA)

#### 拓扑排序

### [字节跳动高频题——排序奇升偶降链表 (qq.com)](https://mp.weixin.qq.com/s/0WVa2wIAeG0nYnVndZiEXQ)

```java

```

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



### 

## 下一个排序

### [31. 下一个排列 - 力扣（Leetcode）](https://leetcode.cn/problems/next-permutation/solutions/)

思路: [31. 下一个排列 - 力扣（Leetcode）](https://leetcode.cn/problems/next-permutation/solutions/80560/xia-yi-ge-pai-lie-suan-fa-xiang-jie-si-lu-tui-dao-/)

定义是：给定数字序列的字典序中下一个更大的排列。如果不存在下一个更大的排列，则将数字重新排列成最小的排列（即升序排列）。我们可以将该问题形式化地描述为：给定若干个数字，将其组合为一个整数。如何将这些数字重新排列，以得到下一个更大的整数。如 123 下一个更大的数为 132。如果没有更大的整数，则输出最小的整数。

算法推导: 

1. 我们希望下一个数 比当前数大，这样才满足 “下一个排列” 的定义。因此只需要 将后面的「大数」与前面的「小数」交换，就能得到一个更大的数。比如 123456，将 5 和 6 交换就能得到一个更大的数 123465。

2. 我们还希望下一个数 增加的幅度尽可能的小，这样才满足“下一个排列与当前排列紧邻“的要求。为了满足这个要求，我们需要：

   - 在 尽可能靠右的低位 进行交换，需要 从后向前 查找

   - 将一个 尽可能小的「大数」 与前面的「小数」交换。比如 123465，下一个排列应该把 5 和 4 交换而不是把 6 和 4 交换
   - 将「大数」换到前面后，需要将「大数」后面的所有数 重置为升序，升序排列就是最小的排列。以 123465 为例：首先按照上一步，交换 5 和 4，得到 123564；然后需要将 5 之后的数重置为升序，得到 123546。显然 123546 比 123564 更小，123546 就是 123465 的下一个排列

```java
  public void nextPermutation(int[] nums) {
        //1. 1,2,3 ==> 1,3,2
        //1. 倒序遍历, 找到第一个数, 这个数比后面的数小;
        //2. 继续倒序遍历, 找到一个比上面的数大的数;
        //3. 交换
        //4. 把1中的这个数后面的数全部递增排列, 因为在1后面的数时递减排列的, 所以首尾交换即可获得升序排列       
        int len = nums.length;
        int i = len - 2; //i = len - 2 是为了防止下面nums[i + 1]越界!
        
        //1. 倒序遍历, 找到第一个数, 这个数比后面的数小;
        while(i >= 0){
            if(nums[i] < nums[i + 1])break;
            --i;
        }
       
        //2. 继续倒序遍历, 找到一个上面的数大的数
        if(i >= 0){
            int j = len - 1;
            while(j >= 0){
                if(nums[j] > nums[i])break;
                --j;
            }
            //3. 交换i和j
            swap(nums, i, j); //交换i和j的位置
        }
        //4. 将 i后面的数升序排列, 只需要对撞双指针交换即可(因为i后面的数时降序的)
        reverse(nums, i + 1, len - 1);
    }

    public void swap(int[] nums, int left, int right){
        int temp = nums[left];
        nums[left] = nums[right];
        nums[right] = temp;
    }

    public void reverse(int[] nums, int left, int right){
        while(left < right){
            swap(nums, left, right);
            ++left;
            --right;
        }
    }
}
```



```java
  public void nextPermutation(int[] nums) {
        if(nums.length<2){
            return;
        }
        int len=nums.length;
        int i=len-2,j=len-1,k=len-1;
        // find: A[i]<A[j]
        while(i>=0&&nums[i]>=nums[j]){
            i--;
            j--;
        }
        // 不是最后一个排列
        if(i>=0){
            // find: A[i]<A[k]
            while(nums[i]>=nums[k]){
                k--;
            }
            // swap A[i], A[k]
            swap(nums,i,k);
        }
        // reverse A[j:end]
        for(i=j,j=len-1;i<j;i++,j--){
            swap(nums,i,j);
        }
    }

    public void swap(int[] nums,int i,int j){
        int temp=nums[i];
        nums[i]=nums[j];
        nums[j]=temp;

    }
```

### [268. 丢失的数字 - 力扣（Leetcode）](https://leetcode.cn/problems/missing-number/description/)

**排序**

```java
  public int missingNumber(int[] nums) {
        int n = nums.length;
        Arrays.sort(nums);
        for (int i = 0; i < n; i++) {
            if (nums[i] != i) return i;
        }
        return n;
    }

```

**数组哈希**

```java
 public int missingNumber(int[] nums) {
        int n = nums.length;
        boolean[] hash = new boolean[n + 1];
        for (int i = 0; i < n; i++) hash[nums[i]] = true;
        for (int i = 0; i < n; i++) {
            if (!hash[i]) return i;
        }
        return n;
    }
```

#### **原地哈希**

```java
 public int missingNumber(int[] nums) {
        int len=nums.length;
        for(int i=0;i<nums.length;i++){
            int num=nums[i];
            if(num<len&&num != i ){
                swap(nums,num,i--);
            }
        }
        System.out.println(Arrays.toString(nums));
        for(int i=0;i<nums.length;i++){
            int num=nums[i];
            if(num!=i){
                return i;
            }
        }
        return len;
    }

    public void swap(int[] nums,int i,int j){
        int temp=nums[i];
        nums[i]=nums[j];
        nums[j]=temp;
    }
```

#### **作差法**

```java
    public int missingNumber(int[] nums) {
        int n = nums.length;
        int cur = 0, sum = n * (n + 1) / 2;
        for (int i : nums) cur += i;
        return sum - cur;
    }
```

#### **异或**

```java
 public int missingNumber(int[] nums) {
        int n = nums.length;
        int ans = 0;
        for (int i = 0; i <= n; i++) ans ^= i;
        for (int i : nums) ans ^= i;
        return ans;
    }
```





## 二分查找

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

### [33. 搜索旋转排序数组 - 力扣（Leetcode）](https://leetcode.cn/problems/search-in-rotated-sorted-array/)

```java
public int search(int[] nums, int target) {
        int left=0,right=nums.length-1;
        while(left<=right){
            int mid=(left+right)/2;
            if(nums[mid]==target){
                return mid;
            }else if(nums[mid]<nums[right]){
                if(nums[mid]<target&&target<=nums[right]){
                    left=mid+1;
                }else{
                    right=mid-1;
                }
            }else {
                if(nums[mid]>target&&target>=nums[left]){
                    right=mid-1;
                }else{
                    left=mid+1;
                }
            }
        }
        return -1;
    }
```

### [34. 在排序数组中查找元素的第一个和最后一个位置 - 力扣（Leetcode）](https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/)

```java
    public int[] searchRange(int[] nums, int target) {
        int left=0,right=nums.length-1;
        int [] res=new int[2];
        Arrays.fill(res,-1);
        if(nums.length==0)return res;
        while(left<right){
            int mid=left+(right-left)/2;
            if(nums[mid]>=target){
                right=mid;
            }else {
                left=mid+1;
            }
        }
        res[0]=nums[right]==target?right:-1;
        right=nums.length;
        while(left<right){
           int mid=left+(right-left)/2;
           if(nums[mid]<=target){
               left=mid+1;
           }else{
               right=mid;
           }
        }
        if(left>0&&nums[left-1]==target){
            res[1]=left-1;
        }
        return res;
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
        double left = 0;
        double right = x;
        while(true){
            left = 0.5*right+0.5*x/right;
            if(Math.abs(right - left) < err){
                break;
            }
            right = left;
        }
        return right;
    }    
```

### [74. 搜索二维矩阵 - 力扣（Leetcode）](https://leetcode.cn/problems/search-a-2d-matrix/submissions/392791330/)

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

### 剑指 Offer 04. 二维数组中的查找

思路 [剑指 Offer 04. 二维数组中的查找 - 力扣（Leetcode）](https://leetcode.cn/problems/er-wei-shu-zu-zhong-de-cha-zhao-lcof/solutions/95306/mian-shi-ti-04-er-wei-shu-zu-zhong-de-cha-zhao-zuo/)

```java
    int m=matrix.length-1,n=0;
        while(m>=0&&n<matrix[0].length){
            if(matrix[m][n]<target) {
                n++;
            }else if(matrix[m][n]>target){
                m--;
            }else{
                return true;
            }
        }
        return false;
```



### [240. 搜索二维矩阵 II - 力扣（Leetcode）](https://leetcode.cn/problems/search-a-2d-matrix-ii/)

```java
  public boolean searchMatrix(int[][] matrix, int target) {
        int m=0,n=matrix[0].length-1;
        while(m<matrix.length&&n>=0){
            if(matrix[m][n]==target){
                return true;
            }else if (matrix[m][n]>target){
                n--;
            }else{
                m++;
            }
        }
        return false;
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

### [162. 寻找峰值 - 力扣（Leetcode）](https://leetcode.cn/problems/find-peak-element/)

```java
    public int findPeakElement(int[] nums) {
        int left=0,right=nums.length-1;
        while(left<right){
            int mid=left+(right-left)/2;
            if(nums[mid]<nums[mid+1]){
                left=mid+1;
            }else {
                right=mid;
            }
        }
        return left;
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

### [88. 合并两个有序数组 - 力扣（Leetcode）](https://leetcode.cn/problems/merge-sorted-array/)

```java
   public void merge(int[] nums1, int m, int[] nums2, int n) {
        int len=m+n-1;
        m--;n--;
        while(n>=0){
            if(m>=0&&nums1[m]>nums2[n]){
                nums1[len--]=nums1[m--];
            }else{
                nums1[len--]=nums2[n--];
            }
        }
    }
```



### [344. 反转字符串 - 力扣（Leetcode）](https://leetcode.cn/problems/reverse-string/submissions/394527384/)

```java
  public void reverseString(char[] s) {
        int mid=s.length/2;
        for(int i=0;i<mid;i++){
            swap(s,i,s.length-i-1);
        }
    }

    public void swap(char[] s,int i,int j){
        char temp=s[i];
        s[i]=s[j];
        s[j]=temp;
    }
```

[557. 反转字符串中的单词 III - 力扣（Leetcode）](https://leetcode.cn/problems/reverse-words-in-a-string-iii/submissions/)

```java
  public String reverseWords(String s) {
        char[] chars=s.toCharArray();
        int left=0,right=0;
         for(int i=1;i<chars.length;i++){
            char c=chars[i];
            if(c==' '||i==chars.length-1){
                // 最后一位时 right还是再i-1的位置
                if(i==chars.length-1){
                    right++;
                }
                while(left<right){
                    swap(chars,left++,right--);
                }
                left=i+1;
            }else{
                right=i;
            }
         }
         String res=String.valueOf(chars);
         return res;

    }

    public void swap(char[] chars,int left,int right){
        char temp=chars[left];
        chars[left]=chars[right];
        chars[right]=temp;
    }
```

### [41. 缺失的第一个正数 - 力扣（Leetcode）](https://leetcode.cn/problems/first-missing-positive/description/)

```java
    public int firstMissingPositive(int[] nums) {
        int len=nums.length;
        for(int i=0;i<len;i++){
            while(nums[i]>0&&nums[i]<=len&&nums[nums[i]-1]!=nums[i]){
                swap(nums,nums[i]-1,i);
            }
        }
        for(int i=0;i<len;i++){
            if(nums[i]!=i+1){
                return i+1;
            }
        }
        return len+1;
 
    }

    public void swap(int[] nums, int left, int right){
        int temp = nums[left];
        nums[left] = nums[right];
        nums[right] = temp;
    }
```

### [260. 只出现一次的数字 III - 力扣（Leetcode）](https://leetcode.cn/problems/single-number-iii/description/)

### [283. 移动零 - 力扣（Leetcode）](https://leetcode.cn/problems/move-zeroes/)

```java
   public void moveZeroes(int[] nums) {
        int index=0;
        for(int num:nums){
            if(num!=0){
                nums[index++]=num;
            }
        }
        while(index<nums.length){
            nums[index++]=0;
        }
    }
```

### [75. 颜色分类 - 力扣（Leetcode）](https://leetcode.cn/problems/sort-colors/)

```java
 public void sortColors(int[] nums) {
        int left=0,right=nums.length-1,cur=0;
        while(cur<=right){
            if(nums[cur]==0){
               swap(nums,cur,left++);
               cur++;
            }else if(nums[cur]==2){
                swap(nums,cur,right--);
            }else{
                cur++;
            }
        }
    }

    public void swap(int[] nums,int a,int b){
        int temp=nums[a];
        nums[a]=nums[b];
        nums[b]=temp;
    }
```

### [189. 轮转数组 - 力扣（Leetcode）](https://leetcode.cn/problems/rotate-array/)

```java
 public void rotate(int[] nums, int k) {
        if(nums.length<2){
            return;
        }
        k=k%nums.length;
        reverse(nums,0,nums.length-1);
        reverse(nums,0,k-1);
        reverse(nums,k,nums.length-1);
    }

    public void reverse(int[] nums,int start,int end){
        int temp;
        while(start<end){
            temp=nums[start];
            nums[start]=nums[end];
            nums[end]=temp;
            start++;
            end--;
        }
    }
```

### [287. 寻找重复数 - 力扣（Leetcode）](https://leetcode.cn/problems/find-the-duplicate-number/submissions/407940693/)

```java
    public int findDuplicate(int[] nums) {
        int i=0;
        while(i<=nums.length){
            if(nums[i]!=i+1){
                if(nums[i]==nums[nums[i]-1]){
                    return nums[i];
                }else{
                    swap(nums,i,nums[i]-1);
                }
            }else{
                i++;
            }
        }
        return 0;
    }

    public void swap(int[] nums,int i,int j){
        int temp=nums[i];
        nums[i]=nums[j];
        nums[j]=temp;
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

### [48. 旋转图像 - 力扣（Leetcode）](https://leetcode.cn/problems/rotate-image/)

```java
// 矩阵想象成一个套一个的正方形，正方形数量是len/2，每个正方形，每一边上的点交换位置，就达到顺时针转90度的目的
    public void rotate(int[][] matrix) {
        int len=matrix.length;
        for(int i=0;i<len/2;i++){
            int start=i;
            int end=len-i-1;
            for(int j=0;j<end-start;j++){
                int temp=matrix[start][start+j];
                matrix[start][start+j]=matrix[end-j][start];
                matrix[end-j][start]=matrix[end][end-j];
                matrix[end][end-j]=matrix[start+j][end];
                matrix[start+j][end]=temp;
            }
        }
    }
```



## 岛屿问题

### [200. 岛屿数量 - 力扣（Leetcode）](https://leetcode.cn/problems/number-of-islands/)

> 思路：遍历岛这个二维数组，如果当前数为1，则进入感染函数并将岛个数+1
> 感染函数：其实就是一个递归标注的过程，它会将所有相连的1都标注成2。为什么要标注？
> 这样就避免了遍历过程中的重复计数的情况，一个岛所有的1都变成了2后，遍历的时候就不会重复遍历了。
> 建议没想明白的同学画个图看看。

```java
 public int numIslands(char[][] grid) {
        int islandNum = 0;
        for(int i = 0; i < grid.length; i++){
            for(int j = 0; j < grid[0].length; j++){
                if(grid[i][j] == '1'){
                    infect(grid, i, j);
                    islandNum++;
                }
            }
        }
        return islandNum;
    }
    //感染函数
    public void infect(char[][] grid, int i, int j){
        if(i < 0 || i >= grid.length ||
           j < 0 || j >= grid[0].length || grid[i][j] != '1'){
            return;
        }
        grid[i][j] = '2';
        infect(grid, i + 1, j);
        infect(grid, i - 1, j);
        infect(grid, i, j + 1);
        infect(grid, i, j - 1);
    }
```

### [695. 岛屿的最大面积 - 力扣（Leetcode）](https://leetcode.cn/problems/max-area-of-island/submissions/402523748/)

```java
   public int maxAreaOfIsland(int[][] grid) {
        int max = 0;
        for(int i = 0; i < grid.length; i++){
            for(int j = 0; j < grid[0].length; j++){
                if(grid[i][j] == 1){
                    int num=infect(grid, i, j);
                    max=Math.max(max,num);
                }
            }
        }
        return max;
    }

    public int infect(int[][] grid,int i, int j){
        if(i<0||i>=grid.length||j<0||j>=grid[0].length||grid[i][j]!=1){
            return 0;
        }
        grid[i][j]=2;
        int num=1;
        num+=infect(grid,i+1,j);
        num+=infect(grid,i-1,j);
        num+=infect(grid,i,j+1);
        num+=infect(grid,i,j-1);
        return num;
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

### [剑指 Offer 29. 顺时针打印矩阵 - 力扣（Leetcode）](https://leetcode.cn/problems/shun-shi-zhen-da-yin-ju-zhen-lcof/)

```java
	  public int[] spiralOrder(int[][] matrix) {
        if(matrix.length==0){
            return new int[0];
        }
        int left=0,right=matrix[0].length-1,top=0,bottom=matrix.length-1;
        int[] res=new int[matrix.length*matrix[0].length];
        int index=0;
        while(left<=right){
            for(int i=left;i<=right;i++){
                res[index++]=matrix[top][i];
            }
            if(++top>bottom)break;
            for(int i=top;i<=bottom;i++){
                res[index++]=matrix[i][right];
            }
            if(--right<left)break;
            for(int i=right;i>=left;i--){
                res[index++]=matrix[bottom][i];
            }
            if(--bottom<top)break;
            for(int i=bottom;i>=top;i--){
                res[index++]=matrix[i][left];
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

### [20. 有效的括号 - 力扣（Leetcode）](https://leetcode.cn/problems/valid-parentheses/)

#### 栈

```java
    public boolean isValid(String s) {
        LinkedList<Character> stack=new LinkedList();
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            if(c=='('){
                stack.push(')');
            }
            else if(c=='{'){
                stack.push('}');
            }
            else if(c=='['){
                stack.push(']');
            }else{
                if(stack.isEmpty()||!stack.pop().equals(c)){
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }
```

### [32. 最长有效括号 - 力扣（Leetcode）](https://leetcode.cn/problems/longest-valid-parentheses/submissions/)

#### 栈

```java
   public int longestValidParentheses(String s) {
        int max=0;
        Deque<Integer> stack=new LinkedList<Integer>();
        stack.push(-1);
        for(int i=0;i<s.length();i++){
            if(s.charAt(i)=='('){
                stack.push(i);
            }else{
                stack.pop();
                if(stack.isEmpty()){
                    stack.push(i);
                }else{
                    max=Math.max(max,i-stack.peek());
                }
            }
        }
        return max;
    }
}
```

#### 动态规划

思路: 

我们定义 dp[i] 表示以下标 i 字符结尾的最长有效括号的长度。我们将 dp 数组全部初始化为 0 。显然有效的子串一定以 ‘)’ 结尾，因此我们可以知道以 ‘(’结尾的子串对应的 dp 值必定为 0 ，我们只需要求解 ‘)’在 dp 数组中对应位置的值。

我们从前往后遍历字符串求解 dp值，我们每两个字符检查一次：

s[i]=‘)’且 s[i−1]=‘(’，也就是字符串形如 “……()”，我们可以推出：`dp[i]=dp[i−2]+2`

我们可以进行这样的转移，是因为结束部分的 "()" 是一个有效子字符串，并且将之前有效子字符串的长度增加了 2 。

s[i]=‘)’且 s[i−1]=‘)’，也就是字符串形如 “……))”，我们可以推出： 如果 s[i−dp[i−1]−1]=‘(’，那么`dp[i]=dp[i−1]+dp[i−dp[i−1]−2]+2`

```java
 public int longestValidParentheses(String s) {
        int maxans = 0;
        int[] dp = new int[s.length()];
        for (int i = 1; i < s.length(); i++) {
            if (s.charAt(i) == ')') {
                if (s.charAt(i - 1) == '(') {
                    dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
                } else if (i - dp[i - 1] > 0 && s.charAt(i - dp[i - 1] - 1) == '(') {
                    dp[i] = dp[i - 1] + ((i - dp[i - 1]) >= 2 ? dp[i - dp[i - 1] - 2] : 0) + 2;
                }
                maxans = Math.max(maxans, dp[i]);
            }
        }
        return maxans;
    }

```



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
     	//存(的索引
        Stack<Integer> stack=new Stack();
     	//存*的索引
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
     	//可能会存在*(情况
        while(!stack.isEmpty()&&!stack1.isEmpty()){
            if(stack.peek()>stack1.peek())return false;
            stack.pop();
            stack1.pop();
        }
        return stack.isEmpty();
    }
```

### [1047. 删除字符串中的所有相邻重复项 - 力扣（Leetcode）](https://leetcode.cn/problems/remove-all-adjacent-duplicates-in-string/submissions/394485411/)

```java
  public String removeDuplicates(String s) {
        Stack<Character> stack=new Stack();
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            if(stack.isEmpty()||stack.peek()!=c){
                stack.push(c);
            }else{
                stack.pop();      
            }
        }
        StringBuilder sb=new StringBuilder();
        while(!stack.isEmpty()){
            sb.append(stack.pop());
        }
        return sb.reverse().toString();
    }
```



```java
  public int[] maxSlidingWindow(int[] nums, int k) {
        //用双端队列来存储数组的下标，为什么要存下标而不是存数值？
        //因为存下标可以更方便的来确定元素是否需要移出滑动窗口
        //判断下标是否合法来确定是否要移出
        Deque<Integer> q=new LinkedList<>();
        //搞不清res的size就举个例子来确定
        int[] res = new int[nums.length - k + 1] ;
        int index=0;
        for(int i=0;i<nums.length;i++){
            //保证队列的单调递减，使队列的出口始终为最大值
            //注意队列存的是数组下标，所以判断逻辑是nums[i] > nums[q.peekLast()]
            //容易误写成nums[i] > q.peekLast()
            while(!q.isEmpty()&&nums[i]>nums[q.peekLast()]){
                q.pollLast();
            }
            q.offerLast(i);
            // 判断队列出口的值是否合法，如果值的下标不在窗口内则要将其移出
            if(q.peekFirst()<i-k+1){
                q.pollFirst();
            }
            //窗口至少填满一次后才开始放最大值
            //依然要注意队列存的是下标，所以赋值是赋nums[q.peekFirst()]
            if(i >= k - 1){
                res[index++] = nums[q.peekFirst()];
            }
        }
        return res;

    }
```



### [394. 字符串解码 - 力扣（Leetcode）](https://leetcode.cn/problems/decode-string/)

```java
    public static String decodeString(String s) {
        Stack<Integer> stack=new Stack();
        Stack<StringBuffer> stack1=new Stack();
        StringBuffer res=new StringBuffer();
        int digist=0;
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            if(Character.isDigit(c)){
                digist=10*digist+(c-'0');
            } else if(c=='['){
                stack.push(digist);
                stack1.push(res);
                digist=0;
                res=new StringBuffer();
            }else if(c==']'){
                StringBuffer temp=stack1.pop();
                Integer inttemp=stack.pop();
                while(inttemp>0){
                    temp.append(res);
                    inttemp--;
                }
                res=temp;
            }else {
                res.append(c);
            }
        }
        return res.toString();
    }

```

### [402. 移掉 K 位数字 - 力扣（Leetcode）](https://leetcode.cn/problems/remove-k-digits/description/)

#### 单调栈

思路: 为了让结果最小，应删除高位的大数，为了找到这些数，可用单调递增栈。让栈维持固定长度n-k，从左向右遍历，则出栈的就是高位最大的数，则栈内剩余的就是最小的结果。

```java
  public String removeKdigits(String num, int k) {
        Stack<Character> stack=new Stack();
        for(char c:num.toCharArray()){
            while(k > 0 && !stack.isEmpty() && c < stack.peek()){
                stack.pop();
                k--;
            }
            if(c!='0'||!stack.isEmpty()){
                stack.push(c);
            }
        }
        while( k > 0 && !stack.isEmpty()){
            stack.pop();
            k--;
        }
        StringBuffer buffer = new StringBuffer();
        while(!stack.isEmpty()){
            buffer.append(stack.pop());
        }
        return buffer.length() == 0 ? "0" : buffer.reverse().toString();
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

### [179. 最大数 - 力扣（Leetcode）](https://leetcode.cn/problems/largest-number/)

```java
public String largestNumber(int[] nums) {
        int len=nums.length;
        for(int i=0;i<len;i++){
            for(int j=i+1;j<len;j++){
                String a=String.valueOf(nums[i]);
                String b=String.valueOf(nums[j]);
                if((a+b).compareTo(b+a)<0){
                    int temp=nums[j];
                    nums[j]=nums[i];
                    nums[i]=temp;
                }
            }
        }
        StringBuilder res=new StringBuilder();
        for(int num:nums){
            res.append(num);
        }
        while(res.length()>1&&res.charAt(0)=='0'){
            res.deleteCharAt(0);
        }
        return res.toString();
    }
```



## 子集问题

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

### 3. 无重复字符的最长子串

#### **滑动窗口**

```java
public int lengthOfLongestSubstring(String s) {
        int[] map=new int[200];
        int max=0,left=0,right=0,len=s.length();
        while(left<len&&right<len){
            char c=s.charAt(right);
            if(map[c]==0){
                map[c]++;
                right++;
                max=Math.max(max,right-left);
            }else{
                map[s.charAt(left++)]=0;
            }
        }
        return max;
}
```

#### **一次循环**

```java
   public int lengthOfLongestSubstring(String s) {
        int[] map=new int[128];
        // last 区间内字符出现的最大位置
        int max=0,last=0;
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            last=Math.max(map[c],last);
            max=Math.max(i-last+1,max);
            map[c]=i+1;
        }
        return max;
    }
```



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

### [76. 最小覆盖子串 - 力扣（Leetcode）](https://leetcode.cn/problems/minimum-window-substring/solutions/)

```java
  public String minWindow(String s, String t) {
        if (s == null || s.length() == 0 || t == null ||t.length() == 0){
            return "";
        }
        int[] need = new int[128];
        //记录需要的字符的个数
        for (int i = 0;i < t.length(); i++) {
            need[t.charAt(i)]++;
        }
        //l是当前左边界，r是当前右边界，size记录窗口大小，count是需要的字符个数，start是最小覆盖串开始的index
        int l = 0,r = 0,size = Integer.MAX_VALUE,count = t.length(),start = 0;
        //遍历所有字符
        while(r < s.length()) {
            char c = s.charAt(r);
            if (need[c] > 0){//需要字符c
                count--;
            }
            need[c]--;//把右边的字符加入窗口
            if(count == 0) {//窗口中已经包含所有字符
                while (l < r && need[s.charAt(l)] < 0) {
                    need[s.charAt(l)]++;//释放右边移动出窗口的字符
                    l++;//指针右移
                }
                if(r - l + 1 < size) {//不能右移时候挑战最小窗口大小，更新最小窗口开始的start
                    size = r - l + 1;
                    start = l;//记录下最下值时候的开始位置，最后返回复盖串时候会用到
                }
                //l向右移动后窗口肯定不能满足了，重新开始循环
                need[s.charAt(l)]++;
                l++;
                count++;
            }
            r++;
        }
        return size == Integer.MAX_VALUE ? "" : s.substring(start, start + size);
    }
```



### [567. 字符串的排列 - 力扣（Leetcode）](https://leetcode.cn/problems/permutation-in-string/description/)

#### **滑动窗口**

```java
    public boolean checkInclusion(String s1, String s2) {
        int n=s1.length(),m=s2.length();
        if(n>m){
            return false;
        }
        int[] map1=new int[26];
        int[] map2=new int[26];
        for(int i=0;i<n;i++){
            map1[s1.charAt(i)-'a']++;
            map2[s2.charAt(i)-'a']++;
        }
        if(Arrays.equals(map1,map2)){
            return true;
        }
        for(int i=n;i<m;i++){
            ++map2[s2.charAt(i) - 'a'];
            --map2[s2.charAt(i - n) - 'a'];
            //此处可优化,不需要每次比较整个数组
            if(Arrays.equals(map1,map2)){
                return true;
            }
        }
        return false;
    }
```

### [239. 滑动窗口最大值 - 力扣（Leetcode）](https://leetcode.cn/problems/sliding-window-maximum/)

#### 双端队列

```java
   public int[] maxSlidingWindow(int[] nums, int k) {
        //用双端队列来存储数组的下标，为什么要存下标而不是存数值？
        //因为存下标可以更方便的来确定元素是否需要移出滑动窗口
        //判断下标是否合法来确定是否要移出
        Deque<Integer> q=new LinkedList<>();
        //搞不清res的size就举个例子来确定
        int[] res = new int[nums.length - k + 1] ;
        int index=0;
        for(int i=0;i<nums.length;i++){
            //保证队列的单调递减，使队列的出口始终为最大值
            //注意队列存的是数组下标，所以判断逻辑是nums[i] > nums[q.peekLast()]
            //容易误写成nums[i] > q.peekLast()
            while(!q.isEmpty()&&nums[i]>nums[q.peekLast()]){
                q.pollLast();
            }
            q.offerLast(i);
            // 判断队列出口的值是否合法，如果值的下标不在窗口内则要将其移出
            if(q.peekFirst()<i-k+1){
                q.pollFirst();
            }
            //窗口至少填满一次后才开始放最大值
            //依然要注意队列存的是下标，所以赋值是赋nums[q.peekFirst()]
            if(i >= k - 1){
                res[index++] = nums[q.peekFirst()];
            }
        }
        return res;

    }
```



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

### [45. 跳跃游戏 II - 力扣（Leetcode）](https://leetcode.cn/problems/jump-game-ii/)

```java
 public int jump(int[] nums) {
        // 记录当前能跳跃到的位置的边界下标
        int border = 0;
        // 记录在边界范围内，能跳跃的最远位置的下标
        int maxPosition = 0;
        // 记录所用步数
        int steps = 0;
        for(int i=0;i<nums.length-1;i++){
            // 继续往下遍历，统计边界范围内，哪一格能跳得更远，每走一步就更新一次能跳跃的最远位置下标
            // 其实就是在统计下一步的最优情况
            maxPosition = Math.max(maxPosition,nums[i]+i);
            // 如果到达了边界，那么一定要跳了，下一跳的边界下标就是之前统计的最优情况maxPosition，并且步数加1
            if(i==border){
                border = maxPosition;
                steps++;
            }
        }
        return steps;
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

### [15. 三数之和 - 力扣（Leetcode）](https://leetcode.cn/problems/3sum/)

#### 双指针去重

```java
public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> res = new ArrayList<>();
        for(int k = 0; k < nums.length - 2; k++){
            if(nums[k] > 0) break;
            if(k > 0 && nums[k] == nums[k - 1]) continue;
            int i = k + 1, j = nums.length - 1;
            while(i < j){
                int sum = nums[k] + nums[i] + nums[j];
                if(sum < 0){
                    while(i < j && nums[i] == nums[++i]);
                } else if (sum > 0) {
                    while(i < j && nums[j] == nums[--j]);
                } else {
                    res.add(new ArrayList<Integer>(Arrays.asList(nums[k], nums[i], nums[j])));
                    while(i < j && nums[i] == nums[++i]);
                    while(i < j && nums[j] == nums[--j]);
                }
            }
        }
        return res;
    }
```



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
                set.add(num1);
                index1++;
                index2++;
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

### [1004. 最大连续1的个数 III - 力扣（Leetcode）](https://leetcode.cn/problems/max-consecutive-ones-iii/solutions/609055/fen-xiang-hua-dong-chuang-kou-mo-ban-mia-f76z/)

思路: 

- 使用 left 和 right 两个指针，分别指向滑动窗口的左右边界。

- right 主动右移：right 指针每次移动一步。当 A[right] 为 0，说明滑动窗口内增加了一个 0；
- left被动右移：判断此时窗口内 0 的个数，如果超过了 K，则 left 指针被迫右移，直至窗口内的 0 的个数小于等于 K 为止。
- 滑动窗口长度的最大值就是所求。

```java
  public int longestOnes(int[] nums, int k) {
        int n=nums.length;
        int left=0,right=0;
        int zeros=0;
        int max=0;
        while(right<n){
            if(nums[right]==0){
                zeros++;
            }
            while(zeros>k){
                if(nums[left++]==0){
                    zeros--;
                }
            }
            max=Math.max(max,right-left+1);
            right++;
        }
        return max;
    }
```

### [443. 压缩字符串 - 力扣（Leetcode）](https://leetcode.cn/problems/string-compression/solutions/1609059/by-cheless-w-fd24/)

#### **三指针**

```java
 public int compress(char[] chars) {
        //l: 当前填写字符或数字的位置, r: 下一个字符的第一个位置, cur: 当前字符的第一个位置
        int l=0,r=0,cur=0;
        while(r<chars.length){
            // 填写字符
            chars[l++]=chars[cur];
            while(r<chars.length&&chars[cur]==chars[r]){
                r++;
            }
            int len=r-cur;
            if(len>1){
                String lenStr=String.valueOf(len);
                for(int i=0;i<lenStr.length();i++){
                    chars[l++]=lenStr.charAt(i);
                }
            }
            cur=r;
        }
        return l;
    }
```

### [977. 有序数组的平方 - 力扣（Leetcode）](https://leetcode.cn/problems/squares-of-a-sorted-array/description/)

```java
 public int[] sortedSquares(int[] nums) {
        int left=0,right=nums.length-1,index=nums.length-1;
        int[] res=new int[nums.length];
        while(left<=right){
            int leftSquare = nums[left]*nums[left];
            int rightSquare= nums[right]*nums[right];
            if(rightSquare>leftSquare){
                res[index--]=rightSquare;
                right--;
            }else{
                res[index--]=leftSquare;
                left++;
            }
        }
        return res;
### [167. 两数之和 II - 输入有序数组 - 力扣（Leetcode）](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/description/)

#### **双指针**

```java
    public int[] twoSum(int[] numbers, int target) {
        int left=0,right=numbers.length-1;
        while(left<right){
            int sum=numbers[left]+numbers[right];
            if(sum<target){
                left++;
            }else if(sum>target){
                right--;
            }else{
                return new int[]{left+1,right+1};
            }
        }
        return new int[2];
    }
```

### [11. 盛最多水的容器 - 力扣（Leetcode）](https://leetcode.cn/problems/container-with-most-water/)

```java
  public int maxArea(int[] height) {
        int max=0;
        int left=0,right=height.length-1;
        while(left<right){
            int area=Math.min(height[left],height[right])*(right-left);
            max=Math.max(max,area);
            if(height[left]>height[right]){
                right--;
            }else{
                left++;
            }
        }
        return max;
    }
```





## 哈希问题

### [442. 数组中重复的数据 - 力扣（Leetcode）](https://leetcode.cn/problems/find-all-duplicates-in-an-array/)

思路: 所有数字都在[1,n]，每个数字只出现1次或2次，时间O(n)空间O(1)。 =>据此可以锁定“原地哈希”。

#### **将元素交换到对应的位置**

```java
 public List<Integer> findDuplicates(int[] nums) {
        List<Integer> res=new ArrayList();
        // 将数组里的数字num 放到正确的索引上 即num要再索引num-1上
        for(int i=0;i<nums.length;i++){
            while(nums[nums[i]-1]!=nums[i]){
                swap(nums,nums[i]-1,i);
            }
        }
        // 经过上面整理,如果一个数出现过两次,则总会有一个是不在正确索引上的,找出这个即是多次出现的数
        for(int i=0;i<nums.length;i++){
            if(nums[i]-1!=i){
                res.add(nums[i]);
            }
        }
        return res;

    }

    public void swap(int[] nums,int i,int j){
        int temp=nums[j];
        nums[j]=nums[i];
        nums[i]=temp;
    }
```

#### **使用正负号作为标记**

```java
  public List<Integer> findDuplicates(int[] nums) {
        int n = nums.length;
        List<Integer> ans = new ArrayList<Integer>();
        for (int i = 0; i < n; ++i) {
            int x = Math.abs(nums[i]);
            if (nums[x - 1] > 0) {
                nums[x - 1] = -nums[x - 1];
            } else {
                ans.add(x);
            }
        }
        return ans;
    }
```

## 其他

### [77. 组合 - 力扣（Leetcode）](https://leetcode.cn/problems/combinations/description/)

```java
  List<List<Integer>> res=new ArrayList();
    public List<List<Integer>> combine(int n, int k) {
        backtrack(n,1,k,new ArrayList());
        return res;
    }

    public void backtrack(int n,int start,int k,List<Integer> list){
        if(k==0){
            res.add(new ArrayList(list));
            return;
        }
        if(start>n){
            return;
        }

        for(int i=start;i<=n;i++){
            list.add(i);
            backtrack(n,i+1,k-1,list);
            list.remove(list.size()-1);
        }
    }
```

### [470. 用 Rand7() 实现 Rand10() - 力扣（Leetcode）](https://leetcode.cn/problems/implement-rand10-using-rand7/solutions/)

生成的[1,40]等随机,结果再对%10 + 1就可以得到[1,10]等概率,剩下的数[41-49]可以继续同样的处理

```java
    public int rand10() {
        int row,col,idx;
        do{
            row=rand7();
            col=rand7();
            idx=col+(row-1)*7;
        }while(idx>40);
        return 1+(idx-1)%10;
    }
```

### [169. 多数元素 - 力扣（Leetcode）](https://leetcode.cn/problems/majority-element/solutions/)

#### 哈希(o(n))

#### 排序

时间复杂度：O(nlog⁡n)。将数组排序的时间复杂度为 O(nlog⁡n)。

空间复杂度：O(log⁡n)。如果使用语言自带的排序算法，需要使用 O(log⁡n)的栈空间。如果自己编写堆排序，则只需要使用 O(1)的额外空间。

```java
  public int majorityElement(int[] nums) {
        Arrays.sort(nums);
        return nums[nums.length / 2];
    }
```

#### Boyer-Moore 投票算法

**思路**

如果我们把众数记为 +1，把其他数记为 −1，将它们全部加起来，显然和大于 `0`，从结果本身我们可以看出众数比其他数多。

```java
    public int majorityElement(int[] nums) {
        int count=0;
        Integer candidate =null;
        for(int num:nums){
            if(count==0){
                candidate=num;
            }
            count+=(num==candidate)?1:-1;
        }
        return candidate;
    }
```

### [14. 最长公共前缀 - 力扣（Leetcode）](https://leetcode.cn/problems/longest-common-prefix/solutions/)

```java
 public String longestCommonPrefix(String[] strs) {
        String s=strs[0];
        for(int i=0;i<s.length();i++){
            char c=s.charAt(i);
            for(int j=1;j<strs.length;j++){
                char c1=i<strs[j].length()?strs[j].charAt(i):'1';
                if(c1!=c)return s.substring(0,i);
            }
        }
        return s;
    }
```

### [128. 最长连续序列 - 力扣（Leetcode）](https://leetcode.cn/problems/longest-consecutive-sequence/solutions/)

#### 哈希表

```java
  public int longestConsecutive(int[] nums) {
        Set<Integer> map=new HashSet();
        for(int num:nums){
            map.add(num);
        }
        int max=0;
        for(int num:map){
            if(!map.contains(num-1)){
                int currentNum = num;
                int currentStreak = 1;
                while(map.contains(currentNum+1)){
                    currentNum++;
                    currentStreak++;
                }
                max=Math.max(max,currentStreak);
            }
        }
        return max;
    }
```

### [135. 分发糖果 - 力扣（Leetcode）](https://leetcode.cn/problems/candy/submissions/406823245/)

#### 两次循环

思路:  我们可以将「相邻的孩子中，评分高的孩子必须获得更多的糖果」这句话拆分为两个规则，分别处理。

左规则：当 ratings[i−1]<ratings[i] 时，i 号学生的糖果数量将比 i−1 号孩子的糖果数量多。

右规则：当 ratings[i]>ratings[i+1] 时，i 号学生的糖果数量将比 i+1 号孩子的糖果数量多。

在实际代码中，我们先计算出左规则*left* 数组，在计算右规则的时候只需要用单个变量记录当前位置的右规则，同时计算答案即可。

```java
 public int candy(int[] ratings) {
        int n=ratings.length;
        int[] left=new int[n];
        for(int i=0;i<n;i++){
            if(i>0&&ratings[i]>ratings[i-1]){
                left[i]=left[i-1]+1;
            }else{
                left[i]=1;
            }
        }
        int right=0,ret=0;
        for(int i=n-1;i>=0;i--){
            if(i<n-1&&ratings[i]>ratings[i+1]){
                right++;
            }else{
                right=1;
            }
            ret+=Math.max(left[i],right);
        }
        return ret;
    }
```

#### 常数空间遍历

```java

```

#### 变形:连成圈

#### 变形:站成矩阵

### [347. 前 K 个高频元素 - 力扣（Leetcode）](https://leetcode.cn/problems/top-k-frequent-elements/)

#### 堆排序

```java

```

#### 优先队列

```java
  public int[] topKFrequent(int[] nums, int k) {
        LinkedList<Integer> stack=new LinkedList();
        Map<Integer,Integer> map=new HashMap();
        for(int num:nums){
            Integer number=map.getOrDefault(num,0);
            map.put(num,number+1);
        }
        Set<Map.Entry<Integer, Integer>> entries = map.entrySet();
        PriorityQueue<Map.Entry<Integer,Integer>> queue=new PriorityQueue<>((o1,o2)->o1.getValue()-o2.getValue());
        for(Map.Entry<Integer,Integer> entry:entries){
            queue.offer(entry);
            if(queue.size()>k)queue.poll();
        }
        int[] res=new int[k];
        for(int i=k-1;i>=0;i--){
            res[i]=queue.poll().getKey();
        }
        return res;

    }
```



## 运算符

### [136. 只出现一次的数字 - 力扣（Leetcode）](https://leetcode.cn/problems/single-number/)

思路: ^是异或运算符，符号两边的数必须为二进制,当两个boolean类型的变量同真或同假时，结果为假；两个变量一真一假时，结果为真

```java
    public int singleNumber(int[] nums) {
        int a=0;
        for(int num:nums){
            a^=num;
        }
        return a;
    }
```

## 相交链表

### [160. 相交链表](https://leetcode.cn/problems/intersection-of-two-linked-lists/)

思路:

![image-20221214161719196](C:/Windows/_media/argorithm/image-20221214161719196.png)

A走路径a->c->b

B走路径b->c-a 

最终A和B再c1相遇

```java
    public ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        ListNode tempA=headA;
        ListNode tempB=headB;
        while(tempA!=tempB){
            tempA=tempA!=null?tempA.next:headB;
            tempB=tempB!=null?tempB.next:headA;
        }
        return tempA;
    }
```



## 环形链表

### [141. 环形链表](https://leetcode.cn/problems/linked-list-cycle)

#### 快慢指针

```java
   public boolean hasCycle(ListNode head) {
        ListNode slow=head;
        ListNode fast=head;
        while(fast!=null&&fast.next!=null){
            fast=fast.next.next;
            slow=slow.next;
            if(fast==slow){
                return true;
            }
        }
        return false;
    }
```

### [142. 环形链表 II - 力扣（Leetcode）](https://leetcode.cn/problems/linked-list-cycle-ii/)

#### 快慢指针

```java
    public ListNode detectCycle(ListNode head) {
        ListNode fast=head;
        ListNode slow=head;
        while(fast!=null&&fast.next!=null){
            slow=slow.next;
            fast=fast.next.next;
            if(fast==slow){
                fast=head;
                while(fast!=slow){
                    fast=fast.next;
                    slow=slow.next;
                }
                return fast;
            }
        }
        return null;
    }
```



## 反转链表

### [206. 反转链表 - 力扣（Leetcode）](https://leetcode.cn/problems/reverse-linked-list/)

#### **迭代**

```java
 public ListNode reverseList(ListNode head) {
        ListNode res=null;
        ListNode temp=head;
        while(temp!=null){
            ListNode next=temp.next;
            temp.next=res;
            res=temp;
            temp=next;
        }
        return res;
    }
```

#### 递归

```java
   public ListNode reverseList(ListNode head) {
        if(head==null||head.next==null){
            return head;
        }
        ListNode next=reverseList(head.next);
        head.next.next=head;
        head.next=null;
        return next;
    }
```

### [92. 反转链表 II](https://leetcode.cn/problems/reverse-linked-list-ii)

```java
   public ListNode reverseBetween(ListNode head, int left, int right) {
        ListNode dummy=new ListNode(-1);
        dummy.next=head;
        ListNode pre=dummy;
        for(int i=1;i<left;i++){
            pre=pre.next;
        }
        head = pre.next;
        for(int i=left;i<right;i++){
            ListNode next=head.next;
            head.next=next.next;
            next.next=pre.next;
            pre.next=next;
        }
        return dummy.next;
    }
```



### [143. 重排链表](https://leetcode.cn/problems/reorder-list)

#### 中间点+反转+合并

```java
   public void reorderList(ListNode head) {
        if(head==null||head.next==null){
            return;
        }
        ListNode mid = middleNode(head);
        ListNode l1 = head;
        ListNode l2 = mid.next;
        mid.next = null;
        l2=reverse(l2);
        mergeList(l1,l2);
    }

    public ListNode middleNode(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }


  public void mergeList(ListNode l1, ListNode l2) {
        ListNode l1_tmp;
        ListNode l2_tmp;
        while (l1 != null && l2 != null) {
            l1_tmp = l1.next;
            l2_tmp = l2.next;

            l1.next = l2;
            l1 = l1_tmp;

            l2.next = l1;
            l2 = l2_tmp;
        }
    }


   public ListNode reverse(ListNode head) {
       ListNode res=null;
        ListNode temp=head;
        while(temp!=null){
            ListNode next=temp.next;
            temp.next=res;
            res=temp;
            temp=next;
        }
        return res;
    }

```



### [25. K 个一组翻转链表](https://leetcode.cn/problems/reverse-nodes-in-k-group)

#### 迭代

```java
public ListNode reverseKGroup(ListNode head, int k) {
  ListNode res=new ListNode(0);
  res.next=head;
  ListNode pre=res;
  ListNode end=res;
  while(end.next!=null){
      for(int i=0;i<k&&end!=null;i++){
          end=end.next;
      }
      if(end==null){
          break;
      }
      ListNode start=pre.next;
      ListNode next=end.next;
      end.next=null;
      pre.next=reverse(start);
      start.next=next;
      pre=start;
      end=pre;
  }
  return res.next;
}
public ListNode reverse(ListNode head){
  ListNode temp=head;
  ListNode node=null;
  while(temp!=null){
      ListNode next=temp.next;
      temp.next=node;
      node=temp;
      temp=next;
  }
  return node;
}
```



## 合并排序

思路:

1.   一个个合并上去 
2.   分治 
3.   最小堆

### [ 21. 合并两个有序链表](https://leetcode.cn/problems/merge-two-sorted-lists)

#### 递归

```java
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        while(list1!=null&&list2!=null){
            if(list1.val>list2.val){
              list2.next=mergeTwoLists(list1,list2.next);
              return list2;
            }else{
              list1.next=mergeTwoLists(list1.next,list2);
              return list1;
            }
        }
        return list1!=null?list1:list2;
    }
```



### [23. 合并K个排序链表](https://leetcode.cn/problems/merge-k-sorted-lists)

#### 归并排序

```java
    public ListNode mergeKLists(ListNode[] lists) {
        if(lists.length==0){
            return null;
        }
        if(lists.length==1){
            return lists[0];
        }
    
        int len=lists.length;
        int mid=len/2;
        ListNode[] a = new ListNode[mid];
        for(int i=0;i<mid;i++){
            a[i]=lists[i];
        } 
        ListNode[] b = new ListNode[len-mid];
        for(int i=mid;i<len;i++){
            b[i-mid] = lists[i];
        } 
        return merge(mergeKLists(a),mergeKLists(b));

    }

    public ListNode merge(ListNode list1,ListNode list2){
        if(list1==null&&list2==null){
            return null;
        }
        if(list1!=null&&list2!=null){
            if(list1.val<list2.val){
                list1.next=merge(list1.next,list2);
                return list1;
            }else{
                list2.next=merge(list1,list2.next);
                return list2;
            }
        } 
        return list1!=null?list1:list2;
    }
```

### [148. 排序链表](https://leetcode.cn/problems/sort-list)

思路:

1. 快排需要懂，以防面试官提问（易超时） 
2. 最常规的递归版归并排序 

3. 迭代版归并排序


<!-- tabs:start -->

#### **递归归并**

```java
 public ListNode sortList(ListNode head) {
        if(head==null||head.next==null){
            return head;
        }
        ListNode fast=head;
        ListNode slow=head;
        ListNode pre=null;
        while(fast!=null && fast.next!=null){
            fast=fast.next.next;
            pre=slow;
            slow=slow.next;
        }
        pre.next=null;
        return merge(sortList(head),sortList(slow));
    }

    public ListNode merge(ListNode left,ListNode right){
        if(right==null&&left==null){
            return null;
        }
        if(left!=null&&right!=null){
            if(left.val<right.val){
                left.next=merge(left.next,right);
                return left;
            }else{
                right.next=merge(left,right.next);
                return right;
            }
        }
        return left!=null?left:right;
    }
```



#### **迭代版归并**

```java
  public ListNode sortList(ListNode head) {
        if(head==null||head.next==null){
            return head;
        }
        ListNode fast=head;
        ListNode slow=head;
        ListNode pre=null;
        while(fast!=null && fast.next!=null){
            fast=fast.next.next;
            pre=slow;
            slow=slow.next;
        }
        pre.next=null;
        ListNode left = sortList(head);
        ListNode right = sortList(slow);
        ListNode res=new ListNode(0);
        ListNode temp = res;
        while(left!=null&&right!=null){
            if(left.val<right.val){
                temp.next=left;
                left=left.next;
            }else{
                temp.next=right;
                right=right.next;
            }
            temp = temp.next;
        }
        temp.next=left!=null?left:right;
        return res.next;
    }
```



#### **快排**

```java
  public ListNode sortList(ListNode head) {
        //边界
        if(head==null||head.next==null) return head;
        //伪头结点
        ListNode pre=new ListNode(0,head);
        //快排
        quickSort(pre,null);
        //返回头结点
        return pre.next;
    }
    // 输入时伪头结点和尾节点null
    void quickSort(ListNode pre,ListNode end){
        //如果节点数小于1就返回
        if(pre==end||pre.next==end||pre.next.next==end) return;
        //选第一个节点为基准
        ListNode b=pre.next;
        //建立临时链表
        ListNode cur=new ListNode(0);
        //临时左右两指针
        ListNode r=b,l=cur;
        //遍历，右指针下一节点为end，说明当前是最后一个元素，结束
        while(r.next!=end){
            //如果当前元素小于基准，就加入临时链表，并在原链表中删除
            if(r.next.val<b.val){
                l.next=r.next;
                l=l.next;
                r.next=r.next.next;
            } else{
                //不小于基准，右指针后移
                r=r.next;
            }
        }
        //临时链表接在原链表前面，并把伪头结点指向临时节点头结点
        l.next=pre.next;
        pre.next=cur.next;
        //对基准的左右两边递归，注意输入都是伪头结点和两链表的尾节点的下一节点
        quickSort(pre,b);
        quickSort(b,end);
    }
```

<!-- tabs:end -->

## 快慢指针

### [19. 删除链表的倒数第N个节点](https://leetcode.cn/problems/remove-nth-node-from-end-of-list)

```java
  public ListNode removeNthFromEnd(ListNode head, int n) {
        // 解决删除头节点问题
        ListNode dummy = new ListNode(-1);
        dummy.next = head;
        ListNode pre = dummy;
        ListNode slow = head;
        ListNode fast = head;
        for(int i=0;i<n;i++){
            fast = fast.next;
        }
        while(fast!=null){
            pre = pre.next;
            slow = slow.next;
            fast = fast.next;
        }
        pre.next = slow.next;
        return dummy.next;
    }
```



### [剑指 Offer 22. 链表中倒数第k个节点 ](https://leetcode.cn/problems/lian-biao-zhong-dao-shu-di-kge-jie-dian-lcof/submissions/389911593/)

```java
 public ListNode getKthFromEnd(ListNode head, int k) {
        ListNode slow=head;
        ListNode fast=head;
        while(k>0){
            fast=fast.next;
            k--;
        }
        while(fast!=null){
            fast=fast.next;
            slow=slow.next;
        }
        return slow;
    }
```

### [234. 回文链表 ](https://leetcode.cn/problems/palindrome-linked-list/description/)

```java
 public boolean isPalindrome(ListNode head) {
        if(head==null||head.next==null){
            return true;
        }
     	//利用快慢指针查找中间点
        ListNode slow=head;
        ListNode fast=head;
        while(fast!=null&&fast.next!=null){
            fast=fast.next.next;
            slow=slow.next;
        }
        //翻转slow
        ListNode pre=null;
        while(slow!=null){
            ListNode next=slow.next;
            slow.next=pre;
            pre=slow;
            slow=next;
        }
        while(pre!=null){
            if(pre.val!=head.val){
                return false;
            }
            pre=pre.next;
            head=head.next;
        }
        return true;
    }
```

### [876. 链表的中间结点 - 力扣（Leetcode）](https://leetcode.cn/problems/middle-of-the-linked-list/description/)

```java
    public ListNode middleNode(ListNode head) {
        ListNode slow=head;
        ListNode fast=head;
        while(fast!=null&&fast.next!=null){
            fast=fast.next.next;
            slow=slow.next;
        }
        return slow;
    }
```



## 删除重复节点

[83. 删除排序链表中的重复元素](https://leetcode.cn/problems/remove-duplicates-from-sorted-list/)



### [82. 删除排序链表中的重复元素 II ](https://leetcode.cn/problems/remove-duplicates-from-sorted-list-ii/description/?languageTags=java)

思路:

<!-- tabs:start -->

#### **迭代**

```java
 public ListNode deleteDuplicates(ListNode head) {
        ListNode  dummy = new ListNode(0,head);
        ListNode cur = dummy;
        while(cur.next!=null&&cur.next.next!=null){
           if(cur.next.val==cur.next.next.val){
               int x=cur.next.val;
               while(cur.next!=null&&cur.next.val==x){
                   cur.next=cur.next.next;
               }
           }else{
               cur=cur.next;
           }
        }
        return dummy.next;
    }
```

#### **递归**

```java

```



<!-- tabs:end -->

## 两两交换

### [ 24. 两两交换链表中的节点](https://leetcode.cn/problems/swap-nodes-in-pairs)

<!-- tabs:start -->

#### **迭代**

具体而言，交换之前的节点关系是 temp -> node1 -> node2，交换之后的节点关系要变成 temp -> node2 -> node1，因此需要进行如下操作。
完成上述操作之后，节点关系即变成 temp -> node2 -> node1。再令 temp = node1，对链表中的其余节点进行两两交换，直到全部节点都被两两交换。

```java
 public ListNode swapPairs(ListNode head) {
        if(head==null||head.next==null){
            return head;
        }
        ListNode newHead=new ListNode(0,head);
        ListNode temp=newHead;
        while(temp.next!=null&&temp.next.next!=null){
            ListNode node1=temp.next;
            ListNode node2=temp.next.next;
            temp.next=node2;
            node1.next=node2.next;
            node2.next=node1;
            temp=node1;
        }
        return newHead.next;
        
    }
```

#### **递归**

```java
    public ListNode swapPairs(ListNode head) {
        if(head==null||head.next==null){
            return head;
        }
        ListNode newHead=head.next;
        head.next=swapPairs(newHead.next);
        newHead.next=head;
        return newHead;
    }
```

<!-- tabs:end -->

### [328. 奇偶链表](https://leetcode.cn/problems/odd-even-linked-list)

```java
  public ListNode oddEvenList(ListNode head) {
        if(head==null||head.next==null){
            return head;
        }
        ListNode odd = head;
        ListNode evenHead = head.next;
        ListNode evenTail = evenHead;
        while(odd.next!=null&&evenTail.next!=null){
            odd.next=evenTail.next;
            odd=odd.next;
            evenTail.next=odd.next;
            evenTail=evenTail.next;
        }
        odd.next=evenHead;
        return head;
    }
```



## 二叉搜索树与双向链表

### [114. 二叉树展开为链表](https://leetcode.cn/problems/flatten-binary-tree-to-linked-list)

<!-- tabs:start-->

#### **递归**

```java
    TreeNode pre = null;
    public void flatten(TreeNode root) {
        if(root==null){
            return;
        }
        // 递归由后向前,因此由右向左
        flatten(root.right);
        flatten(root.left);
        root.right=pre;
        root.left=null;
        pre = root;
    }
```

**迭代**

```java
    public void flatten(TreeNode root) {
        while(root!=null){
             //左子树为 null，直接考虑下一个节点
            if(root.left==null){
                root=root.right;
            }else{
                // 找左子树最右边的节点
                TreeNode pre=root.left;
                while(pre.right!=null){
                    pre=pre.right;
                }
                //将原来的右子树接到左子树的最右边节点
                pre.right=root.right;
                root.right=root.left;
                root.left=null;
                 // 考虑下一个节点
                root=root.right;
            }
        }
    }
```



<!-- tabs:end -->

### 剑指 Offer 36. 二叉搜索树与双向链表

```java
Node pre, head;
public Node treeToDoublyList(Node root) {
    // 边界值
    if(root == null) return null;
    dfs(root);  // 题目要求头尾连接
    head.left = pre;
    pre.right = head;
    // 返回头节点
    return head;
}
void dfs(Node cur) {
    // 递归结束条件
    if(cur == null) return;
    dfs(cur.left);
    // 如果pre为空，就说明是第一个节点，头结点，然后用head保存头结点，用于之后的返回
    if (pre == null) head = cur;
    // 如果不为空，那就说明是中间的节点。并且pre保存的是上一个节点，
    // 让上一个节点的右指针指向当前节点
    else pre.right = cur;
    // 再让当前节点的左指针指向父节点，也就连成了双向链表
    cur.left = pre;
    // 保存当前节点，用于下层递归创建
    pre = cur;
    dfs(cur.right);
}
```

## 补充题

### 字节跳动高频题——排序奇升偶降链表

给定一个奇数位升序，偶数位降序的链表，将其重新排序。

```
输入: 1->8->3->6->5->4->7->2->NULL
输出: 1->2->3->4->5->6->7->8->NULL
```

题目分析 

> \1. 按奇偶位置拆分链表，得1->3->5->7->NULL和8->6->4->2->NULL
>
> \2. 反转偶链表，得1->3->5->7->NULL和2->4->6->8->NULL
>
> \3. 合并两个有序链表，得1->2->3->4->5->6->7->8->NULL

时间复杂度为O(N)，空间复杂度O(1)。

思路很清晰，实现起来其实还是有些难度的，因为这里的每一步其实都可以单独抽出来作为一道题。

第2步和第3步分别对应的力扣206. 反转链表和21. 合并两个有序链表，而第1步的解法与328. 奇偶链表差不多。如果搞懂这3道leetcode，那么本篇文章的这道题肯定不在话下了。

## 旋转链表

### [61. 旋转链表](https://leetcode.cn/problems/rotate-list)

```java
 public ListNode rotateRight(ListNode head, int k) {
        if(head==null||k==0||head.next==null){
            return head;
        }
        ListNode temp = head;
        int len=0;
        while(temp!=null){
            temp = temp.next;
            len++;
        }
        k =len - k%len;
        // 等于0返回原链表
        if(k==len){
            return head;
        }
        ListNode pre=null;
        temp=head;
        while(k>0){
            pre = temp;
            temp = temp.next;
            k--;
        }
        pre.next=null;
        ListNode newHead=temp;
        while(temp.next!=null){
            temp=temp.next;
        }
        temp.next=head;
        return newHead;
     
    }
```

## 两数相加

### [2. 两数相加 ](https://leetcode.cn/problems/add-two-numbers/submissions/391191673/)

```java
  public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
       ListNode res=new ListNode(0),cur=res;
       int add=0;
       while(l1!=null||l2!=null||add!=0){
           int sum=add;
           if(l1!=null&&l2!=null){
                sum+=l1.val+l2.val;
                l1=l1.next;
                l2=l2.next;
           }else if(l1!=null){
                sum+=l1.val;
                l1=l1.next;
           }else if(l2!=null){
                sum+=l2.val;
                l2=l2.next;
           }
           add=sum/10;
           sum=sum%10;
           ListNode node=new ListNode(sum);
           cur.next=node;
           cur=node;
       }
       return res.next;
    }
```

### [445. 两数相加 II - 力扣（Leetcode）](https://leetcode.cn/problems/add-two-numbers-ii/)

#### 递归

```java
 public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        l1 = reverse(l1);
        l2 = reverse(l2);
        return reverse(add(l1, l2));
    }

    public ListNode reverse(ListNode head) {
        if(head == null || head.next == null) return head;
        ListNode result = reverse(head.next);
        head.next.next = head;
        head.next = null;
        return result;
    }

    public ListNode add(ListNode l1, ListNode l2) {
        if(l1 == null) return l2;
        if(l2 == null) return l1;
        int sum = l1.val + l2.val;
        ListNode result = new ListNode(sum % 10);
        result.next = add(l1.next, l2.next);
        if(sum > 9) result.next = add(result.next, new ListNode(1));
        return result;
    }
```



#### 反转

```java

```



#### 栈

```java

```



## 分隔链表

### [86. 分隔链表 - 力扣（Leetcode）](https://leetcode.cn/problems/partition-list/description/)

思路: 创建两个链表,分别存放小于或大于对节点,最后合并两节点

```java
 public ListNode partition(ListNode head, int x) {
        ListNode small =new ListNode(-1);
        ListNode smallHeader=small;
        ListNode large=new ListNode(-1);
        ListNode largeHeader=large;
        while(head!=null){
            if(head.val<x){
                smallHeader.next=head;
                smallHeader=smallHeader.next;
            }else{
                largeHeader.next=head;
                largeHeader=largeHeader.next;
            }
            head=head.next;
        }
        smallHeader.next=large.next;
        largeHeader.next=null;
        return small.next;
    }
```

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

### [125. 验证回文串 - 力扣（Leetcode）](https://leetcode.cn/problems/valid-palindrome/submissions/407648595/?languageTags=java)

```java
  public boolean isPalindrome(String s) {
        s=s.toLowerCase();
        int left=0,right=s.length()-1;
        while(left<=right){
            if(!Character.isLetterOrDigit(s.charAt(left))){
                left++;
                continue;
            }
            if(!Character.isLetterOrDigit(s.charAt(right))){
                right--;
                continue;
            }
            if(s.charAt(left)!=s.charAt(right)){
                return false;
            }
            left++;
            right--;
        }
        return true;
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

## 其他

### [字节跳动高频题——圆环回原点问题 (qq.com)](https://mp.weixin.qq.com/s/NZPaFsFrTybO3K3s7p7EVg)

### [91. 解码方法 - 力扣（Leetcode）](https://leetcode.cn/problems/decode-ways/)

```java
 public int numDecodings(String s) {
        if(s.charAt(0)=='0'){
            return 0;
        }
        int[] dp=new int[s.length()+1];
        dp[0]=1;
        for(int i=0;i<s.length();i++){
            char c = s.charAt(i);
            dp[i+1]=c=='0'?0:dp[i];
            if(i>0){
                char pre = s.charAt(i-1);
                if(pre=='1'||(pre=='2'&&c<='6')){
                    dp[i+1]+=dp[i-1];
                }
            }
        }
        return dp[s.length()];
    }
```

### [96. 不同的二叉搜索树 - 力扣（Leetcode）](https://leetcode.cn/problems/unique-binary-search-trees/)

```java
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
```

## 数据结构

### [146. LRU 缓存 - 力扣（Leetcode）](https://leetcode.cn/problems/lru-cache/description/)

#### 双向链表+哈希

```java
class LRUCache {

    Map<Integer,Node> map;
    Node head;
    Node tail;
    int capacity;

    class Node{
        Integer key, value;
        Node next, pre;
        public Node(Integer key,Integer value){
            this.key=key;
            this.value=value;
        }
    }

    public LRUCache(int capacity) {
        this.map=new HashMap();
        this.head=new Node(0,0);
        this.tail=new Node(0,0);
        head.next=tail;
        tail.pre=head;
        this.capacity=capacity;
    }
    
    public int get(int key) {
        if(map.containsKey(key)){
            Node node=map.get(key);
            moveTail(node);
            return node.value;
        }
        return -1;
    }
    
    public void put(int key, int value) {
        if(map.containsKey(key)){
            Node node=map.get(key);
            node.value=value;
            moveTail(node);
        }else{
            if(map.size()==capacity){
                removeHead();
            }
            Node node=new Node(key,value);
            addTail(node);
            map.put(key,node);
        }
    }

    public void addTail(Node node){
        Node last=tail.pre;
        last.next=node;
        node.pre=last;
        node.next=tail;
        tail.pre=node;
    }
    
    public void moveTail(Node node){
        Node pre=node.pre;
        Node next=node.next;
        pre.next=next;
        next.pre=pre;
        addTail(node);
    }

    public void removeHead(){
        if(head.next==tail){
            return;
        }
        Node next=head.next;
        head.next=next.next;
        next.next.pre=head;
        next.next=null;
        next.pre=null;
        map.remove(next.key);
    }
}
```


### [380. O(1) 时间插入、删除和获取随机元素 - 力扣（Leetcode）](https://leetcode.cn/problems/insert-delete-getrandom-o1/description/)

#### 数组+哈希表

```java
class RandomizedSet {
    List<Integer> nums;
    Map<Integer, Integer> indices;
    Random random;

    public RandomizedSet() {
        nums = new ArrayList<Integer>();
        indices = new HashMap<Integer, Integer>();
        random = new Random();
    }
    
    public boolean insert(int val) {
       if (indices.containsKey(val)) {
            return false;
        }
        int index = nums.size();
        nums.add(val);
        indices.put(val, index);
        return true;

    }
    
    public boolean remove(int val) {
        if (!indices.containsKey(val)) {
            return false;
        }
        int index = indices.get(val);
        int last = nums.get(nums.size() - 1);
        nums.set(index, last);
        indices.put(last, index);
        nums.remove(nums.size() - 1);
        indices.remove(val);
        return true;
    }
    
    public int getRandom() {
        int randomIndex = random.nextInt(nums.size());
        return nums.get(randomIndex);
    }
}
```

### [622. 设计循环队列 - 力扣（Leetcode）](https://leetcode.cn/problems/design-circular-queue/description/)

#### 数组

#### 链表

```java
class MyCircularQueue {
    private ListNode head;//链表的头节点，队列的头节点
    private ListNode tail;//链表的尾节点，队列的尾节点
    private int capacity;//队列的容量，即队列可以存储的最大元素数量
    private int size;//队列当前的元素的数量。

    public MyCircularQueue(int k) {
        capacity = k;
        size = 0;
    }
	
    //向循环队列插入一个元素。如果成功插入则返回真。
    public boolean enQueue(int value) {
        if (isFull()) {
            return false;
        }
        ListNode node = new ListNode(value);
        if (head == null) {
            head = tail = node;
        } else {
            tail.next = node;
            tail = node;
        }
        size++;
        return true;
    }
	//从循环队列中删除一个元素。如果成功删除则返回真。
    public boolean deQueue() {
        if (isEmpty()) {
            return false;
        }
        ListNode node = head;
        head = head.next;  
        size--;
        return true;
    }
	//从队首获取元素。如果队列为空，返回 -1 。
    public int Front() {
        if (isEmpty()) {
            return -1;
        }
        return head.val;
    }
	
    //获取队尾元素。如果队列为空，返回 -1 。
    public int Rear() {
        if (isEmpty()) {
            return -1;
        }
        return tail.val;
    }

    public boolean isEmpty() {
        return size == 0;
    }

    public boolean isFull() {
        return size == capacity;
    }
}

```

### [706. 设计哈希映射 - 力扣（Leetcode）](https://leetcode.cn/problems/design-hashmap/)

#### 链地址法

思路: 设哈希表的大小为 base，则可以设计一个简单的哈希函数：hash(x)=x  mod base。

我们开辟一个大小为 base 的数组，数组的每个位置是一个链表。当计算出哈希值之后，就插入到对应位置的链表当中。

由于我们使用整数除法作为哈希函数，为了尽可能避免冲突，应当将 base 取为一个质数。在这里，我们取 base=769。

```java
class MyHashMap {
    private static final int BASE=769;
    private LinkedList[] data;

    class Node{
        private Integer key;
        private Integer value;
        public Node(int key,int value){
            this.key=key;
            this.value=value;
        }
    }

    public MyHashMap() {
        data=new LinkedList[BASE];
        // for(int i=0;i<BASE;i++){
        //     data[i] = new LinkedList<Node>();
        // }
    }
    
    public void put(int key, int value) {
        int h = hash(key);
        LinkedList list = data[h];
        if(list==null){
            list=new LinkedList<Node>();
            data[h]=list;
        }
        Iterator<Node> iterator=list.iterator();
        while(iterator.hasNext()){
            Node element=iterator.next();
            if(element.key==key){
                element.value=value;
                return;
            }
        }
        list.add(new Node(key,value));

    }
    
    public int get(int key) {
        int h = hash(key);
        LinkedList list = data[h];
        if(list==null){
            return-1;
        }
        Iterator<Node> iterator=list.iterator();
        while(iterator.hasNext()){
            Node element=iterator.next();
            if(element.key==key){
                return element.value;
            }
        }
        return -1;
    }
    
    public void remove(int key) {
        int h = hash(key);
        LinkedList list = data[h];
        if(list==null){
            return;
        }
        Iterator<Node> iterator=list.iterator();
        while(iterator.hasNext()){
            Node element=iterator.next();
            if(element.key==key){
                list.remove(element);
                return ;
            }
        }
    }

    private static int hash(int key) {
        return key % BASE;
    }
}

/**
 * Your MyHashMap object will be instantiated and called as such:
 * MyHashMap obj = new MyHashMap();
 * obj.put(key,value);
 * int param_2 = obj.get(key);
 * obj.remove(key);
 */
```

### [155. 最小栈 - 力扣（Leetcode）](https://leetcode.cn/problems/min-stack/)

```java
class MinStack {

    Stack<Integer> stack=new Stack();
    Stack<Integer> minStack=new Stack();
    
    public MinStack() {

    }
    
    public void push(int val) {
        if(!minStack.isEmpty()){
            int min = Math.min(minStack.peek(),val);
            minStack.push(min);
        }else{
            minStack.push(val);
        }
        stack.push(val);
    }
    
    public void pop() {
       minStack.pop();
       stack.pop();
    }
    
    public int top() {
        return stack.peek();
    }   
    
    public int getMin() {
        return minStack.peek();
    }
}
```

### [208. 实现 Trie (前缀树) - 力扣（Leetcode）](https://leetcode.cn/problems/implement-trie-prefix-tree/)

```java
class Trie {

    class TrieNode {
        boolean val;
        TrieNode[] children=new TrieNode[26];
    }

    TrieNode root;

    public Trie() {
        root=new TrieNode();
    }
    
    public void insert(String word) {
        TrieNode p=root;
        for(char c:word.toCharArray()){
            int i=c-'a';
            if(p.children[i]==null) p.children[i]=new TrieNode();
            p=p.children[i];
        }
        p.val=true;
    }
    
    public boolean search(String word) {
        TrieNode p=root;
        for(char c:word.toCharArray()){
            int i=c-'a';
            if(p.children[i]==null) return false;
            p=p.children[i];
        }
        return p.val;
    }
    
    public boolean startsWith(String prefix) {
        TrieNode p=root;
        for(char c:prefix.toCharArray()){
            int i=c-'a';
            if(p.children[i]==null) return false;
            p=p.children[i];
        }
        return true;
    }
}
```

### 

二叉树

## 层序遍历

### [102.二叉树的层序遍历](https://leetcode.cn/problems/binary-tree-level-order-traversal/) 

#### 递归

```java
 public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res=new ArrayList();
        dfs(root,res,0);
        return res;
    }

    public void dfs(TreeNode root,List<List<Integer>> res,int level){
        if(root==null){
            return;
        }
        if(res.size()<=level){
            res.add(new ArrayList());
        }
        List<Integer> list=res.get(level);
        list.add(root.val);
        dfs(root.left,res,level+1);
        dfs(root.right,res,level+1);
    }
```

#### 队列+迭代

```java
public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res=new ArrayList<>();
        if(root==null){
            return res;
        }
        Queue<TreeNode> queue=new LinkedList<TreeNode>();
        queue.add(root);
        while(!queue.isEmpty()){
            int size=queue.size();
            List<Integer> res1=new ArrayList<>();
            while(size>0){
               TreeNode temp= queue.poll();
               if(temp.left!=null){
                   queue.add(temp.left);
               }
               if(temp.right!=null){
                   queue.add(temp.right);
               }
               res1.add(temp.val);
               size--;
            }
            res.add(res1);
        }
        return res;
    }
```

### [103. 二叉树的锯齿形层序遍历 - 力扣（Leetcode）](https://leetcode.cn/problems/binary-tree-zigzag-level-order-traversal/)

#### 队列

```java
  public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
        LinkedList<TreeNode> queue=new LinkedList();
        queue.add(root);
        List<List<Integer>> res=new ArrayList();
        if(root==null){
            return res;
        }
        boolean isleft=true;
        while(queue.size()>0){
            int size=queue.size();
            List<Integer> list=new ArrayList();
            while(size>0){
                TreeNode node=queue.poll();
                if(node.left!=null){
                    queue.add(node.left);
                }
                if(node.right!=null){
                    queue.add(node.right);
                }
                if(isleft){
                    list.add(node.val);
                }else{
                    list.add(0,node.val);
                }
                size--;
            }
             res.add(list);
             isleft=!isleft;
        }
        return res;
    }
```

####  递归

```java
    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
        List<List<Integer>> res=new ArrayList();
        dfs(root,res,0);
        return res;
    }
public void dfs(TreeNode root,List<List<Integer>> res,int level){
    if(root==null){
        return;
    }
    if(res.size()<=level){
        res.add(new ArrayList());
    }
    List<Integer> list = res.get(level);
    if(level%2==0){
        list.add(root.val);
    }else{
        list.add(0,root.val);
    }
    dfs(root.left,res,level+1);
    dfs(root.right,res,level+1);
}
```

### [199. 二叉树的右视图](https://leetcode.cn/problems/binary-tree-right-side-view/)

## 前中后序遍历

思路:

1. 前序遍历的方式是：首先访问根节点，然后访问左子树，最后访问右子树。
2. 中序遍历的方式是：首先访问左子树，接着访问根结点，最后访问右子树。
3. 后序遍历的方式是：首先访问左子树，接着访问右子树，最后访问根结点。

### [94. 二叉树的中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/)

## 二叉树翻转

### [27. 二叉树的镜像](https://leetcode.cn/problems/er-cha-shu-de-jing-xiang-lcof/)

### [226. 翻转二叉树 - 力扣（Leetcode）](https://leetcode.cn/problems/invert-binary-tree/)

### 递归

```java
 public TreeNode invertTree(TreeNode root) {
        if(root==null){
            return root;
        }
        TreeNode temp=root.left;
        root.left=root.right;
        root.right=temp;
        invertTree(root.left);
        invertTree(root.right);
        return root;
    }
```

### 迭代

```java
  public TreeNode invertTree(TreeNode root) {
        if(root==null){
            return null;
        }
        LinkedList<TreeNode> queue = new  LinkedList();
        queue.add(root);
        while(queue.size()>0){
            int size=queue.size();
            for(int i=0;i<size;i++){
                TreeNode node = queue.poll();
                TreeNode temp = node.left;
                node.left=node.right;
                node.right=temp;
                if(node.left!=null){
                    queue.add(node.left);
                }
                if(node.right!=null){
                    queue.add(node.right);
                }
            }
        }
        return root;
    }
```



## 二叉树转链表

### [114. 二叉树展开为链表 - 力扣（Leetcode）](https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/submissions/393981168/)

[思路](https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/submissions/393981168/)

<!-- tabs:start -->

#### **迭代**

```java
   public void flatten(TreeNode root) {
        while(root!=null){
             //左子树为 null，直接考虑下一个节点
            if(root.left==null){
                root=root.right;
            }else{
                // 找左子树最右边的节点
                TreeNode pre=root.left;
                while(pre.right!=null){
                    pre=pre.right;
                }
                //将原来的右子树接到左子树的最右边节点
                pre.right=root.right;
                root.right=root.left;
                root.left=null;
                 // 考虑下一个节点
                root=root.right;
            }
        }
    }
```

#### **递归**

```java
    TreeNode pre=null;
    public void flatten(TreeNode root) {
        if(root==null) return ;
        flatten(root.right);
        flatten(root.left);
        root.right=pre;
        root.left=null;
        pre=root;
    }
```

<!-- tabs:end -->

## 二叉树相同问题

### [572. 另一棵树的子树 - 力扣（Leetcode）](https://leetcode.cn/problems/subtree-of-another-tree/submissions/393152860/)

```java
public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        // 我s都遍历完了。你居然还没匹配上。那就返回false
      return (root!=null&&subRoot!=null)&&( isSubtree(root.left,subRoot)||isSubtree(root.right,subRoot)||isSameTree(root,subRoot));
    }

    public boolean isSameTree(TreeNode root,TreeNode subRoot){
        if(root==null&&subRoot==null){
            return true;
        }
        if(root==null || subRoot==null){
            return false;
        }
        if(root.val!=subRoot.val){
            return false;
        }
        return isSameTree(root.left,subRoot.left)&&isSameTree(root.right,subRoot.right);
    }
```

### [剑指 Offer 26. 树的子结构 - 力扣（Leetcode）](https://leetcode.cn/problems/shu-de-zi-jie-gou-lcof/submissions/407655946/)

```java
 public boolean isSubStructure(TreeNode A, TreeNode B) {

        return ((A!=null&&B!=null)&&(isSameTree(A,B)||isSubStructure(A.left,B)||isSubStructure(A.right,B)));
    }

     public boolean isSameTree(TreeNode root,TreeNode subRoot){
        if(root==null&&subRoot==null){
            return true;
        }
        if(subRoot==null){
            return true;
        }
        if(root==null){
            return false;
        }
        if(root.val!=subRoot.val){
            return false;
        }
        return isSameTree(root.left,subRoot.left)&&isSameTree(root.right,subRoot.right);
    }
```



#### [100. 相同的树 - 力扣（Leetcode）](https://leetcode.cn/problems/same-tree/description/)

```java
 public boolean isSameTree(TreeNode p, TreeNode q) {
        if(p==null&&q==null){
            return true;
        }
        if(p==null||q==null||q.val!=p.val){
            return false;
        }
        return isSameTree(p.left,q.left)&&isSameTree(p.right,q.right);
    }
```






## 平衡二叉树

一个二叉树每个节点 的左右两个子树的高度差的绝对值不超过 1 。

### [110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/)  

用递归方法和后序遍历写

```java
  public boolean isBalanced(TreeNode root) {
        return dfs(root)==-1?false:true;
    }

    public int dfs(TreeNode root){
        if(root==null){
            return 0;
        }
        int left=dfs(root.left);
        int right=dfs(root.right);
        if(left>=0&&right>=0&&Math.abs(left-right)<=1){
            return Math.max(right,left)+1;
        }
        return -1;
    }
```



## 完全二叉树

在一个 完全二叉树 中，除了最后一个关卡外，所有关卡都是完全被填满的，并且最后一个关卡中的所有节点都是尽可能靠左的。它可以包含 1 到 2h 节点之间的最后一级 h 。

### [222. 完全二叉树的节点个数 - 力扣（Leetcode）](https://leetcode.cn/problems/count-complete-tree-nodes/description/)

#### 二分查找 + 位运算

```java
 public int countNodes(TreeNode root) {
        if (root == null) {
            return 0;
        }
        int level = 0;
        TreeNode node = root;
        while (node.left != null) {
            level++;
            node = node.left;
        }
        int low=1<<level,high=(1<<(level+1))-1;
        while(low<high){
            int mid=low+(high-low+1)/2;
            if(exists(root,level,mid)){
                low=mid;
            }else{
                high=mid-1;
            }
        }
        return low;

    }

  public boolean exists(TreeNode root, int level, int k) {
        int bits = 1 << (level - 1);
        TreeNode node = root;
        while (node != null && bits > 0) {
            if ((bits & k) == 0) {
                node = node.left;
            } else {
                node = node.right;
            }
            bits >>= 1;
        }
        return node != null;
    }
```

### [958. 二叉树的完全性检验 - 力扣（Leetcode）](https://leetcode.cn/problems/check-completeness-of-a-binary-tree/solutions/?languageTags=java)

#### 迭代

```java
public boolean isCompleteTree(TreeNode root) {
        LinkedList<TreeNode> q=new LinkedList();
        q.add(root);
        while(q.peekFirst()!=null){
            TreeNode cur=q.removeFirst();
            q.add(cur.left);
            q.add(cur.right);
        }
        while(!q.isEmpty()){
            if(q.removeFirst()!=null){
                return false;
            }
        }
        return true;
    }
```

#### 递归

```java

```



## 二叉搜索树

**有效** 二叉搜索树定义如下：

- 节点的左子树只包含 **小于** 当前节点的数。
- 节点的右子树只包含 **大于** 当前节点的数。
- 所有左子树和右子树自身必须也是二叉搜索树。

### [98. 验证二叉搜索树](https://leetcode.cn/problems/validate-binary-search-tree)

```java
 public boolean isValidBST(TreeNode root) {
        return isValidBST(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }

    public boolean isValidBST(TreeNode node, long lower, long upper) {
        if (node == null) {
            return true;
        }
        if (node.val <= lower || node.val >= upper) {
            return false;
        }
        return isValidBST(node.left, lower, node.val) && isValidBST(node.right, node.val, upper);
    }
```

### [剑指 Offer 54. 二叉搜索树的第k大节点](https://leetcode.cn/problems/er-cha-sou-suo-shu-de-di-kda-jie-dian-lcof/description/)

```java
class Solution {
    int res,k;
    public int kthLargest(TreeNode root, int k) {
        this.k=k;
        dfs(root);
        return res;
    }

    public void dfs(TreeNode root){
        if(root==null) return;
        dfs(root.right);
        if(k==0){
            return;
        }
        if(--k==0) {
            res=root.val;
        } 
        dfs(root.left);
    }
}
```

### [230. 二叉搜索树中第K小的元素 - 力扣（Leetcode）](https://leetcode.cn/problems/kth-smallest-element-in-a-bst/submissions/392807490/)

### [450. 删除二叉搜索树中的节点 - 力扣（Leetcode）](https://leetcode.cn/problems/delete-node-in-a-bst/submissions/393132436/)

```java
  public TreeNode deleteNode(TreeNode root, int key) {
        if(root==null){
            return null;
        }
        if(root.val>key){
            root.left = deleteNode(root.left,key);
            return root;
        }
        if(root.val<key){
            root.right=deleteNode(root.right,key);
            return root;
        }
        if(root.val==key){
            if(root.left!=null&&root.right!=null){
                TreeNode temp = root.right;
                while(temp.left!=null){
                    temp=temp.left;
                }
                root.right = deleteNode(root.right,temp.val);
                temp.right=root.right;
                temp.left=root.left;
                return temp;
            }else{
                return root.left!=null?root.left:root.right;
            }
        }
        return root;
    }
```



## 最大/最小问题

### [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)

```java
   int max=Integer.MIN_VALUE;
    public int maxPathSum(TreeNode root) {
        dfs(root);
        return max;
    }

    public int dfs(TreeNode root){
        if(root==null){
            return 0;
        }
        int left=Math.max(0,dfs(root.left));
        int right=Math.max(0,dfs(root.right));
        int sum=right+left+root.val;
        max=Math.max(sum,max);
        return Math.max(left,right)+root.val;
    }
```



### [111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/)

## 路径和问题

### [112. 路径总和](https://leetcode.cn/problems/path-sum)

```java
    public boolean hasPathSum(TreeNode root, int targetSum) {
        if(root==null){
            return false;
        }
        if(root.left==null&&root.right==null){
            return targetSum==root.val;
        }
        return hasPathSum(root.left,targetSum-root.val)||hasPathSum(root.right,targetSum-root.val);
    }
```

### [129. 求根节点到叶节点数字之和 - 力扣（Leetcode）](https://leetcode.cn/problems/sum-root-to-leaf-numbers/description/)

```java
  int sum=0;
    public int sumNumbers(TreeNode root) {
        dfs(root,0);
        return sum;
    }

    public void dfs(TreeNode root,int val){
        if(root==null){
            sum+=val;
            return;
        }
        val=val*10+root.val;
        if(root.left==null&&root.right==null){
            sum+=val;
            return;
        }
        if(root.left!=null){
            dfs(root.left,val);
        }
        if(root.right!=null){
            dfs(root.right,val);
        }
    }
```



## 回溯算法

### [二叉树中和为某一值的路径](https://leetcode.cn/problems/er-cha-shu-zhong-he-wei-mou-yi-zhi-de-lu-jing-lcof/description/)

### [二叉树中所有距离为 K 的结点](https://leetcode.cn/problems/all-nodes-distance-k-in-binary-tree/)

### [113.路径和2](https://leetcode.cn/problems/path-sum-ii/submissions/391970172/)

```java
  List<List<Integer>> res=new ArrayList();
    public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        pathSum(root,targetSum,new ArrayList());
        return res;
    }

    public void pathSum(TreeNode root,int targetSum,List<Integer> list){
        if(root==null){
           return;
        }
        list.add(root.val);
        targetSum-=root.val;
        if(root.left==null&&root.right==null&&targetSum==0){
            res.add(new ArrayList(list));
        }
        pathSum(root.left,targetSum,list);
        pathSum(root.right,targetSum,list);
        list.remove(list.size()-1); 
    }
```

### [863. 二叉树中所有距离为 K 的结点 - 力扣（Leetcode）](https://leetcode.cn/problems/all-nodes-distance-k-in-binary-tree/description/)

```java
 Map<Integer, TreeNode> parents = new HashMap<Integer, TreeNode>();
    List<Integer> ans = new ArrayList<Integer>();

    public List<Integer> distanceK(TreeNode root, TreeNode target, int k) {
                // 从 root 出发 DFS，记录每个结点的父结点
        findParents(root);

        // 从 target 出发 DFS，寻找所有深度为 k 的结点
        findAns(target, null, 0, k);

        return ans;

    }

    public void findParents(TreeNode node) {
        if(node.left!=null){
            parents.put(node.left.val,node);
            findParents(node.left);
        }
        if(node.right!=null){
            parents.put(node.right.val,node);
            findParents(node.right);
        }
    }

     public void findAns(TreeNode node, TreeNode from, int depth, int k) {
         if(node==null){
             return;
         }
         if(depth==k){
             ans.add(node.val);
             return;
         }
         if(node.left!=from){
             findAns(node.left,node,depth+1,k);
         }
         if(node.right!=from){
             findAns(node.right,node,depth+1,k);
         }
         if(parents.get(node.val)!=from){
             findAns(parents.get(node.val),node,depth+1,k);
         }
     }
```



## 构造二叉树

### [思路](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/solutions/15244/xiang-xi-tong-su-de-si-lu-fen-xi-duo-jie-fa-by--22/)

解法一、递归  
先序遍历的顺序是根节点，左子树，右子树。中序遍历的顺序是左子树，根节点，右子树。

所以我们只需要根据先序遍历得到根节点，然后在中序遍历中找到根节点的位置，它的左边就是左子树的节点，右边就是右子树的节点。

生成左子树和右子树就可以递归的进行了。

``` java
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        return build(preorder,0,preorder.length,inorder,0,inorder.length);
    }

    public TreeNode build(int[] preorder,int pStart, int pEnd,int[] inorder,int inStart,int inEnd){
        if(pStart==pEnd){
            return null;
        }
        int rootVal=preorder[pStart];
        TreeNode root=new TreeNode(rootVal);
        // 从中序遍历中找根节点
        int iRootIndex=0;
        for(int i=inStart;i<inEnd;i++){
            if(rootVal==inorder[i]){
                iRootIndex=i;
                break;
            }
        }
        int leftNum=iRootIndex-inStart;
        root.left=build(preorder,pStart+1,pStart+leftNum+1,inorder,inStart,iRootIndex);
        root.right=build(preorder,pStart+leftNum+1,pEnd,inorder,iRootIndex+1,inEnd);
        return root;
    }
```

优化 我们可以用一个HashMap把中序遍历数组的每个元素的值和下标存起来，这样寻找根节点的位置就可以直接得到了

```java
    Map<Integer,Integer> map=new HashMap();
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        for(int i=0;i<inorder.length;i++){
            map.put(inorder[i],i);
        }
        return build(preorder,0,preorder.length,inorder,0,inorder.length);
    }

    public TreeNode build(int[] preorder,int pStart, int pEnd,int[] inorder,int inStart,int inEnd){
        if(pStart==pEnd){
            return null;
        }
        int rootVal=preorder[pStart];
        TreeNode root=new TreeNode(rootVal);
        // 从中序遍历中找根节点
        int iRootIndex=map.get(rootVal);
       
        int leftNum=iRootIndex-inStart;
        root.left=build(preorder,pStart+1,pStart+leftNum+1,inorder,inStart,iRootIndex);
        root.right=build(preorder,pStart+leftNum+1,pEnd,inorder,iRootIndex+1,inEnd);
    return root;
    }
```

解法二、迭代 栈

我们用一个栈保存已经遍历过的节点，遍历前序遍历的数组，一直作为当前根节点的左子树，直到当前节点和中序遍历的数组的节点相等了，那么我们正序遍历中序遍历的数组，倒着遍历已经遍历过的根节点（用栈的 pop 实现），找到最后一次相等的位置，把它作为该节点的右子树。

用一个栈保存已经遍历的节点，用 curRoot 保存当前正在遍历的节点

```java
 public TreeNode buildTree(int[] preorder, int[] inorder) {
        if(preorder.length==0){
            return null;
        }
        LinkedList<TreeNode> roots=new LinkedList();
        int pre=0,in=0;
        TreeNode curRoot=new TreeNode(preorder[pre++]);
        TreeNode root=curRoot;
        roots.push(curRoot);
        while(pre<preorder.length){
            if(curRoot.val==inorder[in]){
                //每次进行出栈，实现倒着遍历
                while(!roots.isEmpty()&&roots.peek().val==inorder[in]){
                    curRoot=roots.peek();
                    roots.pop();
                    in++;
                }
                // 设为当前的右孩子
                curRoot.right=new TreeNode(preorder[pre]);
                curRoot=curRoot.right;
                roots.push(curRoot);
                pre++;
            }else{
                //否则的话就一直作为左子树
                curRoot.left = new TreeNode(preorder[pre]);
                curRoot = curRoot.left;
                roots.push(curRoot);
                pre++;
            }
        }
        return root;
    }
```

### [105. 从前序与中序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/description/)

### [106. 从中序与后序遍历序列构造二叉树 - 力扣（Leetcode）](https://leetcode.cn/problems/construct-binary-tree-from-inorder-and-postorder-traversal/)

```java
 	HashMap<Integer,Integer> memo = new HashMap<>();
    int[] post;

    public TreeNode buildTree(int[] inorder, int[] postorder) {
        for(int i = 0;i < inorder.length; i++) memo.put(inorder[i], i);
        post = postorder;
        TreeNode root = build(0, inorder.length - 1, 0, post.length - 1);
        return root;

    }
    public TreeNode build(int inStart,int inEnd,int posStart,int posEnd){
        if(posEnd<posStart||inEnd<inStart){
            return null;
        }
        int rootVal = post[posEnd];
        int rootIndex=memo.get(rootVal);
        TreeNode node=new TreeNode(rootVal);
        int leftNum=rootIndex-inStart;
        node.left=build(inStart,rootIndex-1,posStart,posStart+leftNum-1);
        node.right=build(rootIndex+1,inEnd,posStart+leftNum,posEnd-1);
        return node;
    }
```



##  最近的共同祖先

> 思路: 
>
> 考虑通过递归对二叉树进行先序遍历，当遇到节点 p 或 q时返回。从底至顶回溯，当节点 p,q 在节点 root的异侧时，节点 root 即为最近公共祖先，则向上返回 root 。递归解析：
>
> 终止条件：  
>
> 1. 当越过叶节点，则直接返回 null ；
> 2. 当 root 等于 p,q ，则直接返回 root；
>    递推工作：
> 3. 开启递归左子节点，返回值记为 left ；
> 4. 开启递归右子节点，返回值记为 right ；
>    返回值： 根据 开启递归左子节点，返回值记为 left ；和 right ，可展开为四种情况；
> 5. 当 left 和 right同时为空 ：说明 root 的左 / 右子树中都不包含 p,q ，返回 null；
> 6. 当 left 和 right同时不为空 ：说明 p,q分列在 root 的 异侧 （分别在 左 / 右子树），因此 rootrootroot 为最近公共祖先，返回 root；
> 7. 当 left 为空 ，right 不为空 ：p,q 都不在 root的左子树中，直接返回 right。具体可分为两种情况：
>    1. p,q其中一个在 root 的 右子树 中，此时 right 指向 p（假设为 p ）； p,q两节点都在 root的 右子树 中，此时的 right指向 最近公共祖先节点 ；
>    2. 当 left 不为空 ， right为空 ：与情况 3. 同理；

```java
 public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
         if(root==null||root==p||root==q){
             return root;
         }
         TreeNode left=lowestCommonAncestor(root.left,p,q);
         TreeNode right=lowestCommonAncestor(root.right,p,q);
         if(left!=null&&right!=null){
            return root;
         }
        return left!=null?left:right;
    }
```



### [236. 二叉树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/)  

```java
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if(root==null||root==q||root==p){
            return root;
        }
        TreeNode left = lowestCommonAncestor(root.left,p,q);
        TreeNode right =  lowestCommonAncestor(root.right,p,q);
        // 如果left 和 right都不为空，说明此时root就是最近公共节点
        // 如果left为空，right不为空，就返回right，说明目标节点是通过right返回的，反之亦然。
        if(left!=null&&right!=null){
            return root;
        }
        return left!=null?left:right;
    }
```





### [101. 对称二叉树 - 力扣（Leetcode）](https://leetcode.cn/problems/symmetric-tree/)

#### 队列

```java
 public boolean isSymmetric(TreeNode root) {
        if(root==null || (root.left==null && root.right==null)) {
			return true;
		}
        LinkedList<TreeNode> queue=new LinkedList();
        queue.add(root.left);
        queue.add(root.right);
        while(queue.size()>0){
                TreeNode left=queue.poll();
                TreeNode right=queue.poll();
                if(left==null&&right==null){
                     continue;
                }
                if(left==null||right==null||left.val!=right.val){
                    return false;
                }
                queue.add(left.right);
                queue.add(right.left);
                queue.add(left.left);
                queue.add(right.right);
        }
        return true;
    }
```

#### 递归

```java
   public boolean isSymmetric(TreeNode root) {
        return isSymmetric(root.left,root.right);
    }

    public boolean isSymmetric(TreeNode left,TreeNode right){
        if(left==null&&right==null){
            return true;
        }
        if(left==null||right==null){
            return false;
        }
        if(left.val!=right.val){
            return false;
        }
        return isSymmetric(left.right,right.left)&& isSymmetric(left.left,right.right);
        
    }
```

