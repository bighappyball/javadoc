
## 二叉树

### 层序遍历

[102.二叉树的层序遍历](https://leetcode.cn/problems/binary-tree-level-order-traversal/) 

[199. 二叉树的右视图](https://leetcode.cn/problems/binary-tree-right-side-view/)

### 前中后序遍历

思路:
1. 前序遍历的方式是：首先访问根节点，然后访问左子树，最后访问右子树。
2. 中序遍历的方式是：首先访问左子树，接着访问根结点，最后访问右子树。
3. 后序遍历的方式是：首先访问左子树，接着访问右子树，最后访问根结点。

[94. 二叉树的中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/)

### 二叉树翻转

[27. 二叉树的镜像](https://leetcode.cn/problems/er-cha-shu-de-jing-xiang-lcof/)



### 构造二叉树

前序找根，中序来分。意思是每次都可以通过前序找到根节点，再用中序遍历确定新的左右子树的范围，最后递归这个过程就可以了。


### 平衡二叉树

一个二叉树每个节点 的左右两个子树的高度差的绝对值不超过 1 。

[110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/)  用递归方法和后序遍历写

### 完全二叉树

在一个 完全二叉树 中，除了最后一个关卡外，所有关卡都是完全被填满的，并且最后一个关卡中的所有节点都是尽可能靠左的。它可以包含 1 到 2h 节点之间的最后一级 h 。

### 二叉搜索树

**有效** 二叉搜索树定义如下：

- 节点的左子树只包含 **小于** 当前节点的数。
- 节点的右子树只包含 **大于** 当前节点的数。
- 所有左子树和右子树自身必须也是二叉搜索树。

#### [98. 验证二叉搜索树](https://leetcode.cn/problems/validate-binary-search-tree)

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
#### [剑指 Offer 54. 二叉搜索树的第k大节点](https://leetcode.cn/problems/er-cha-sou-suo-shu-de-di-kda-jie-dian-lcof/description/)
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

#### [230. 二叉搜索树中第K小的元素 - 力扣（Leetcode）](https://leetcode.cn/problems/kth-smallest-element-in-a-bst/submissions/392807490/)

### 最大/最小问题

[124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)

[111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/)

### 路径和问题

#### [112. 路径总和](https://leetcode.cn/problems/path-sum)

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



### 回溯算法

[二叉树中和为某一值的路径](https://leetcode.cn/problems/er-cha-shu-zhong-he-wei-mou-yi-zhi-de-lu-jing-lcof/description/)

[二叉树中所有距离为 K 的结点](https://leetcode.cn/problems/all-nodes-distance-k-in-binary-tree/)

[路径和2](https://leetcode.cn/problems/path-sum-ii/submissions/391970172/)

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

### 构造二叉树

[思路:](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/solutions/15244/xiang-xi-tong-su-de-si-lu-fen-xi-duo-jie-fa-by--22/)

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

[105. 从前序与中序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/description/)

###  最近的共同祖先

思路: 

考虑通过递归对二叉树进行先序遍历，当遇到节点 p 或 q时返回。从底至顶回溯，当节点 p,q 在节点 root的异侧时，节点 root 即为最近公共祖先，则向上返回 root 。

递归解析：

终止条件：  
1. 当越过叶节点，则直接返回 null ；
2. 当 root 等于 p,q ，则直接返回 root；
递推工作：
1. 开启递归左子节点，返回值记为 left ；
2. 开启递归右子节点，返回值记为 right ；
返回值： 根据 开启递归左子节点，返回值记为 left ；和 right ，可展开为四种情况；
1. 当 left 和 right同时为空 ：说明 root 的左 / 右子树中都不包含 p,q ，返回 null；
2. 当 left 和 right同时不为空 ：说明 p,q分列在 root 的 异侧 （分别在 左 / 右子树），因此 rootrootroot 为最近公共祖先，返回 root；
3. 当 left 为空 ，right 不为空 ：p,q 都不在 root的左子树中，直接返回 right。具体可分为两种情况：
    1. p,q其中一个在 root 的 右子树 中，此时 right 指向 p（假设为 p ）； p,q两节点都在 root的 右子树 中，此时的 right指向 最近公共祖先节点 ；
    2. 当 left 不为空 ， right为空 ：与情况 3. 同理；

[236. 二叉树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/)  

