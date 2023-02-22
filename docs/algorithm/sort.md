## 算法分类

比较类排序：通过比较来决定元素间的相对次序，由于其时间复杂度不能突破O(nlogn)，因此也称为非线性时间比较类排序。  

非比较类排序：不通过比较来决定元素间的相对次序，它可以突破基于比较排序的时间下界，以线性时间运行，因此也称为线性时间非比较类排序。  

![alt 排序算法分类](../_media/argorithm/sort/849589-20190306165258970-1789860540.png)  

### 算法复杂度

![alt 排序算法分类](../_media/argorithm/sort/849589-20180402133438219-1946132192.png) 

### 相关概念

1. 稳定：如果a原本在b前面，而a=b，排序之后a仍然在b的前面。
2. 不稳定：如果a原本在b的前面，而a=b，排序之后 a 可能会出现在 b 的后面。
3. 时间复杂度：对排序数据的总的操作次数。反映当n变化时，操作次数呈现什么规律。
4. 空间复杂度：是指算法在计算机

### 冒泡排序（Bubble Sort）

冒泡排序是一种简单的排序算法。它重复地走访过要排序的数列，一次比较两个元素，如果它们的顺序错误就把它们交换过来。走访数列的工作是重复地进行直到没有再需要交换，也就是说该数列已经排序完成。这个算法的名字由来是因为越小的元素会经由交换慢慢“浮”到数列的顶端。 

时间平均n2  时间最坏n2  时间最好n 空间 1  稳定

![alt 冒泡排序](../_media/argorithm/sort/849589-20171015223238449-2146169197.gif) 

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

![alt 选择排序](../_media/argorithm/sort/849589-20171015224719590-1433219824.gif) 

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

![alt 插入排序](../_media/argorithm/sort/849589-20171015225645277-1151100000.gif) 


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

![alt 希尔排序](../_media/argorithm/sort/849589-20180331170017421-364506073.gif) 

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

![alt 归并排序](../_media/argorithm/sort/849589-20171015230557043-37375010.gif) 

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

![alt 堆排序](../_media/argorithm/sort/849589-20171015231308699-356134237.gif) 

## **拓扑排序**

用有向图描述依赖关系
示例：n = 6，先决条件表：[[3, 0], [3, 1], [4, 1], [4, 2], [5, 3], [5, 4]]
课 0, 1, 2 没有先修课，可以直接选。其余的课，都有两门先修课。
我们用有向图来展现这种依赖关系（做事情的先后关系）：

![微信截图_20200517052852.png](../_media/analysis/netty/de601db5bd50985014c7a6b89bca8aa231614b4ba423620dd2e31993c75a9137-微信截图_20200517052852.png)这种叫 有向无环图，把一个 有向无环图 转成 线性的排序 就叫 拓扑排序。
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

