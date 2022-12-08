### 层序遍历

[102.二叉树的层序遍历](https://leetcode.cn/problems/binary-tree-level-order-traversal/) 

[199. 二叉树的右视图](https://leetcode.cn/problems/binary-tree-right-side-view/)

### 前中后序遍历

思路:
1. 前序遍历的方式是：首先访问根节点，然后访问左子树，最后访问右子树。
2. 中序遍历的方式是：首先访问左子树，接着访问根结点，最后访问右子树。
3. 后序遍历的方式是：首先访问左子树，接着访问右子树，最后访问根结点。

[94. 二叉树的中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/)


### 构造二叉树

### 平衡二叉树
一个二叉树每个节点 的左右两个子树的高度差的绝对值不超过 1 。

[110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/)


### 广度优先搜索

### 最大路径和

[124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)


### 构造二叉树


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

