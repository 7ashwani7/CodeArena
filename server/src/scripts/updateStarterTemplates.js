import { connectDB, disconnectDB } from '../config/db.js';
import { Problem } from '../models/Problem.js';

export const CLEAN_STARTER_CODES = {
  'two-sum': {
    javascript: `function twoSum(nums, target) {
  // Write your code here
  
}`,
    python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        return {};
    }
};`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[0];
    }
}`
  },
  'valid-parentheses': {
    javascript: `function isValid(s) {
  // Write your code here
  
}`,
    python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your code here
        return false;
    }
};`,
    java: `class Solution {
    public boolean isValid(String s) {
        // Write your code here
        return false;
    }
}`
  },
  'longest-substring-without-repeating-characters': {
    javascript: `function lengthOfLongestSubstring(s) {
  // Write your code here
  
}`,
    python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your code here
        return 0;
    }
}`
  },
  'best-time-to-buy-and-sell-stock': {
    javascript: `function maxProfit(prices) {
  // Write your code here
  
}`,
    python: `class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int maxProfit(int[] prices) {
        // Write your code here
        return 0;
    }
}`
  },
  'maximum-subarray': {
    javascript: `function maxSubArray(nums) {
  // Write your code here
  
}`,
    python: `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your code here
        return 0;
    }
}`
  },
  'coin-change': {
    javascript: `function coinChange(coins, amount) {
  // Write your code here
  
}`,
    python: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // Write your code here
        return -1;
    }
};`,
    java: `class Solution {
    public int coinChange(int[] coins, int amount) {
        // Write your code here
        return -1;
    }
}`
  },
  'reverse-linked-list': {
    javascript: `function reverseList(head) {
  // Write your code here
  
}`,
    python: `class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Write your code here
        return nullptr;
    }
};`,
    java: `class Solution {
    public ListNode reverseList(ListNode head) {
        // Write your code here
        return null;
    }
}`
  },
  'container-with-most-water': {
    javascript: `function maxArea(height) {
  // Write your code here
  
}`,
    python: `class Solution:
    def maxArea(self, height: list[int]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int maxArea(vector<int>& height) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int maxArea(int[] height) {
        // Write your code here
        return 0;
    }
}`
  },
  'climbing-stairs': {
    javascript: `function climbStairs(n) {
  // Write your code here
  
}`,
    python: `class Solution:
    def climbStairs(self, n: int) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int climbStairs(int n) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int climbStairs(int n) {
        // Write your code here
        return 0;
    }
}`
  },
  'trapping-rain-water': {
    javascript: `function trap(height) {
  // Write your code here
  
}`,
    python: `class Solution:
    def trap(self, height: list[int]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int trap(int[] height) {
        // Write your code here
        return 0;
    }
}`
  },
  'number-of-islands': {
    javascript: `function numIslands(grid) {
  // Write your code here
  
}`,
    python: `class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int numIslands(char[][] grid) {
        // Write your code here
        return 0;
    }
}`
  },
  'course-schedule': {
    javascript: `function canFinish(numCourses, prerequisites) {
  // Write your code here
  
}`,
    python: `class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        // Write your code here
        return false;
    }
};`,
    java: `class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // Write your code here
        return false;
    }
}`
  },
  'binary-target-search': {
    javascript: `function search(nums, target) {
  // Write your code here
  
}`,
    python: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your code here
        return -1;
    }
};`,
    java: `class Solution {
    public int search(int[] nums, int target) {
        // Write your code here
        return -1;
    }
}`
  },
  'find-minimum-in-rotated-sorted-array': {
    javascript: `function findMin(nums) {
  // Write your code here
  
}`,
    python: `class Solution:
    def findMin(self, nums: list[int]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int findMin(vector<int>& nums) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int findMin(int[] nums) {
        // Write your code here
        return 0;
    }
}`
  },
  'maximum-depth-of-binary-tree': {
    javascript: `function maxDepth(root) {
  // Write your code here
  
}`,
    python: `class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    int maxDepth(TreeNode* root) {
        // Write your code here
        return 0;
    }
};`,
    java: `class Solution {
    public int maxDepth(TreeNode root) {
        // Write your code here
        return 0;
    }
}`
  },
  'validate-binary-search-tree': {
    javascript: `function isValidBST(root) {
  // Write your code here
  
}`,
    python: `class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    bool isValidBST(TreeNode* root) {
        // Write your code here
        return false;
    }
};`,
    java: `class Solution {
    public boolean isValidBST(TreeNode root) {
        // Write your code here
        return false;
    }
}`
  },
  'middle-of-the-linked-list': {
    javascript: `function middleNode(head) {
  // Write your code here
  
}`,
    python: `class Solution:
    def middleNode(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # Write your code here
        pass`,
    cpp: `class Solution {
public:
    ListNode* middleNode(ListNode* head) {
        // Write your code here
        return nullptr;
    }
};`,
    java: `class Solution {
    public ListNode middleNode(ListNode head) {
        // Write your code here
        return null;
    }
}`
  },
  'alien-dictionary-draft': {
    javascript: `function alienOrder(words) {
  // Write your code here
  return "";
}`
  }
};

async function updateAllStarterCodes() {
  await connectDB();
  console.log('Connected to MongoDB. Updating starter codes in database...');

  let updatedCount = 0;
  for (const [slug, starterCode] of Object.entries(CLEAN_STARTER_CODES)) {
    const res = await Problem.updateOne(
      { slug },
      { $set: { starterCode } }
    );
    if (res.matchedCount > 0) {
      updatedCount++;
    }
  }

  console.log(`Successfully updated starter templates for ${updatedCount} problems in MongoDB.`);
  await disconnectDB();
}

if (process.argv[1] && process.argv[1].endsWith('updateStarterTemplates.js')) {
  updateAllStarterCodes().catch((err) => {
    console.error('Error updating starter codes:', err);
    process.exit(1);
  });
}
