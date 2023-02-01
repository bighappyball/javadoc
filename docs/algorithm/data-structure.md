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

### 

