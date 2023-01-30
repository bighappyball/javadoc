## 数据结构

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



