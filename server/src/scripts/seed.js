import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { CLEAN_STARTER_CODES } from './updateStarterTemplates.js';


export const SEED_PROBLEMS = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    topics: ['Arrays & Hashing', 'Hash Table'],
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'Because nums[1] + nums[2] == 6, return [1, 2].' }
    ],
    starterCode: {
      javascript: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}',
      python: 'class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            diff = target - num\n            if diff in seen:\n                return [seen[diff], i]\n            seen[num] = i\n        return []',
      cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> m;\n        for (int i = 0; i < nums.size(); ++i) {\n            int diff = target - nums[i];\n            if (m.count(diff)) return {m[diff], i};\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};',
      java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) return new int[] { map.get(diff), i };\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false },
      { input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2,4]', isHidden: true },
      { input: '[1000000000, -1000000000]\n0', expectedOutput: '[0,1]', isHidden: true }
    ],
    acceptanceRate: 52.4,
    submissionCount: 1420,
    acceptedCount: 744
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'Easy',
    topics: ['Stack', 'Strings'],
    description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only "()[]{}"'
    ],
    examples: [
      { input: 's = "()"', output: 'true', explanation: 'Simple matching bracket pair.' },
      { input: 's = "()[]{}"', output: 'true', explanation: 'Sequential matching pairs.' },
      { input: 's = "(]"', output: 'false', explanation: 'Mismatched closing bracket.' }
    ],
    starterCode: {
      javascript: 'function isValid(s) {\n  const stack = [];\n  const map = { ")": "(", "}": "{", "]": "[" };\n  for (const c of s) {\n    if (c in map) {\n      if (stack.pop() !== map[c]) return false;\n    } else stack.push(c);\n  }\n  return stack.length === 0;\n}',
      python: 'class Solution:\n    def isValid(self, s: str) -> bool:\n        stack = []\n        pairs = {")": "(", "}": "{", "]": "["}\n        for c in s:\n            if c in pairs:\n                if not stack or stack.pop() != pairs[c]: return False\n            else: stack.append(c)\n        return len(stack) == 0',
      cpp: 'class Solution {\npublic:\n    bool isValid(string s) {\n        stack<char> st;\n        for (char c : s) {\n            if (c == "(" || c == "{" || c == "[") st.push(c);\n            else {\n                if (st.empty()) return false;\n                if (c == ")" && st.top() != "(") return false;\n                if (c == "}" && st.top() != "{") return false;\n                if (c == "]" && st.top() != "[") return false;\n                st.pop();\n            }\n        }\n        return st.empty();\n    }\n};',
      java: 'class Solution {\n    public boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == "(") stack.push(")");\n            else if (c == "{") stack.push("}");\n            else if (c == "[") stack.push("]");\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '"()"', expectedOutput: 'true', isHidden: false },
      { input: '"([)]"', expectedOutput: 'false', isHidden: true },
      { input: '"{[]}"', expectedOutput: 'true', isHidden: true }
    ],
    acceptanceRate: 40.8,
    submissionCount: 980,
    acceptedCount: 400
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'Medium',
    topics: ['Strings', 'Sliding Window'],
    description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with the length of 1.' }
    ],
    starterCode: {
      javascript: 'function lengthOfLongestSubstring(s) {\n  let maxLen = 0, left = 0;\n  const set = new Set();\n  for (let r = 0; r < s.length; r++) {\n    while (set.has(s[r])) { set.delete(s[left++]); }\n    set.add(s[r]);\n    maxLen = Math.max(maxLen, r - left + 1);\n  }\n  return maxLen;\n}',
      python: 'class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        char_map = {}\n        l = max_len = 0\n        for r, char in enumerate(s):\n            if char in char_map and char_map[char] >= l:\n                l = char_map[char] + 1\n            char_map[char] = r\n            max_len = max(max_len, r - l + 1)\n        return max_len',
      cpp: 'class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        vector<int> m(128, -1);\n        int maxL = 0, l = 0;\n        for (int r = 0; r < s.size(); ++r) {\n            if (m[s[r]] >= l) l = m[s[r]] + 1;\n            m[s[r]] = r;\n            maxL = max(maxL, r - l + 1);\n        }\n        return maxL;\n    }\n};',
      java: 'class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        int[] m = new int[128];\n        Arrays.fill(m, -1);\n        int maxL = 0, l = 0;\n        for (int r = 0; r < s.length(); ++r) {\n            if (m[s.charAt(r)] >= l) l = m[s.charAt(r)] + 1;\n            m[s.charAt(r)] = r;\n            maxL = Math.max(maxL, r - l + 1);\n        }\n        return maxL;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '"abcabcbb"', expectedOutput: '3', isHidden: false },
      { input: '"pwwkew"', expectedOutput: '3', isHidden: true },
      { input: '" "', expectedOutput: '1', isHidden: true }
    ],
    acceptanceRate: 34.6,
    submissionCount: 840,
    acceptedCount: 291
  },
  {
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    difficulty: 'Easy',
    topics: ['Arrays & Hashing', 'Dynamic Programming'],
    description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4'
    ],
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 5.' },
      { input: 'prices = [7,6,4,3,1]', output: '0', explanation: 'No transactions achieved positive profit.' }
    ],
    starterCode: {
      javascript: 'function maxProfit(prices) {\n  let minPrice = Infinity, maxP = 0;\n  for (const p of prices) {\n    if (p < minPrice) minPrice = p;\n    else if (p - minPrice > maxP) maxP = p - minPrice;\n  }\n  return maxP;\n}',
      python: 'class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_p = float("inf")\n        max_p = 0\n        for p in prices:\n            if p < min_p: min_p = p\n            elif p - min_p > max_p: max_p = p - min_p\n        return max_p',
      cpp: 'class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minP = INT_MAX, maxP = 0;\n        for (int p : prices) {\n            minP = min(minP, p);\n            maxP = max(maxP, p - minP);\n        }\n        return maxP;\n    }\n};',
      java: 'class Solution {\n    public int maxProfit(int[] prices) {\n        int minP = Integer.MAX_VALUE, maxP = 0;\n        for (int p : prices) {\n            if (p < minP) minP = p;\n            else if (p - minP > maxP) maxP = p - minP;\n        }\n        return maxP;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[7,1,5,3,6,4]', expectedOutput: '5', isHidden: false },
      { input: '[1,2]', expectedOutput: '1', isHidden: true }
    ],
    acceptanceRate: 54.1,
    submissionCount: 1100,
    acceptedCount: 595
  },
  {
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    difficulty: 'Medium',
    topics: ['Dynamic Programming', 'Arrays & Hashing'],
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.',
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' }
    ],
    starterCode: {
      javascript: 'function maxSubArray(nums) {\n  let cur = nums[0], maxS = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    maxS = Math.max(maxS, cur);\n  }\n  return maxS;\n}',
      python: 'class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        cur = max_s = nums[0]\n        for n in nums[1:]:\n            cur = max(n, cur + n)\n            max_s = max(max_s, cur)\n        return max_s',
      cpp: 'class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int cur = nums[0], res = nums[0];\n        for (size_t i = 1; i < nums.size(); ++i) {\n            cur = max(nums[i], cur + nums[i]);\n            res = max(res, cur);\n        }\n        return res;\n    }\n};',
      java: 'class Solution {\n    public int maxSubArray(int[] nums) {\n        int cur = nums[0], res = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            cur = Math.max(nums[i], cur + nums[i]);\n            res = Math.max(res, cur);\n        }\n        return res;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
      { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true }
    ],
    acceptanceRate: 50.7,
    submissionCount: 650,
    acceptedCount: 330
  },
  {
    title: 'Coin Change',
    slug: 'coin-change',
    difficulty: 'Medium',
    topics: ['Dynamic Programming'],
    description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up, return -1.',
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4'
    ],
    examples: [
      { input: 'coins = [1,2,5], amount = 11', output: '3', explanation: '11 = 5 + 5 + 1' },
      { input: 'coins = [2], amount = 3', output: '-1', explanation: 'Cannot form amount 3.' }
    ],
    starterCode: {
      javascript: 'function coinChange(coins, amount) {\n  const dp = new Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let i = 1; i <= amount; i++) {\n    for (const c of coins) {\n      if (i >= c) dp[i] = Math.min(dp[i], dp[i - c] + 1);\n    }\n  }\n  return dp[amount] === Infinity ? -1 : dp[amount];\n}',
      python: 'class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        dp = [float("inf")] * (amount + 1)\n        dp[0] = 0\n        for i in range(1, amount + 1):\n            for c in coins:\n                if i >= c: dp[i] = min(dp[i], dp[i - c] + 1)\n        return dp[amount] if dp[amount] != float("inf") else -1',
      cpp: 'class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        vector<int> dp(amount + 1, amount + 1);\n        dp[0] = 0;\n        for (int i = 1; i <= amount; ++i) {\n            for (int c : coins) if (i >= c) dp[i] = min(dp[i], dp[i - c] + 1);\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n};',
      java: 'class Solution {\n    public int coinChange(int[] coins, int amount) {\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, amount + 1);\n        dp[0] = 0;\n        for (int i = 1; i <= amount; i++) {\n            for (int c : coins) if (i >= c) dp[i] = Math.min(dp[i], dp[i - c] + 1);\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[1,2,5]\n11', expectedOutput: '3', isHidden: false },
      { input: '[2]\n3', expectedOutput: '-1', isHidden: true }
    ],
    acceptanceRate: 43.1,
    submissionCount: 710,
    acceptedCount: 306
  },
  {
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    difficulty: 'Easy',
    topics: ['Linked Lists'],
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    constraints: [
      'The number of nodes in the list is the range [0, 5000].',
      '-5000 <= Node.val <= 5000'
    ],
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', explanation: 'Reversed pointer directions.' }
    ],
    starterCode: {
      javascript: 'function reverseList(head) {\n  let prev = null, curr = head;\n  while (curr) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}',
      python: 'class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        prev, curr = None, head\n        while curr:\n            nxt = curr.next\n            curr.next = prev\n            prev = curr\n            curr = nxt\n        return prev',
      cpp: 'class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        ListNode* prev = nullptr;\n        while (head) {\n            ListNode* nxt = head->next;\n            head->next = prev;\n            prev = head;\n            head = nxt;\n        }\n        return prev;\n    }\n};',
      java: 'class Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode prev = null;\n        while (head != null) {\n            ListNode nxt = head.next;\n            head.next = prev;\n            prev = head;\n            head = nxt;\n        }\n        return prev;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]', isHidden: false },
      { input: '[]', expectedOutput: '[]', isHidden: true }
    ],
    acceptanceRate: 75.9,
    submissionCount: 1540,
    acceptedCount: 1169
  },
  {
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    difficulty: 'Medium',
    topics: ['Two Pointers', 'Arrays & Hashing'],
    description: 'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i`th line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.',
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4'
    ],
    examples: [
      { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'Max water between indices 1 and 8: 7 * (8-1) = 49.' }
    ],
    starterCode: {
      javascript: 'function maxArea(height) {\n  let l = 0, r = height.length - 1, maxW = 0;\n  while (l < r) {\n    maxW = Math.max(maxW, Math.min(height[l], height[r]) * (r - l));\n    if (height[l] < height[r]) l++;\n    else r--;\n  }\n  return maxW;\n}',
      python: 'class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        l, r = 0, len(height) - 1\n        max_w = 0\n        while l < r:\n            max_w = max(max_w, min(height[l], height[r]) * (r - l))\n            if height[l] < height[r]: l += 1\n            else: r -= 1\n        return max_w',
      cpp: 'class Solution {\npublic:\n    int maxArea(vector<int>& h) {\n        int l = 0, r = h.size() - 1, ans = 0;\n        while (l < r) {\n            ans = max(ans, min(h[l], h[r]) * (r - l));\n            if (h[l] < h[r]) l++; else r--;\n        }\n        return ans;\n    }\n};',
      java: 'class Solution {\n    public int maxArea(int[] h) {\n        int l = 0, r = h.length - 1, ans = 0;\n        while (l < r) {\n            ans = Math.max(ans, Math.min(h[l], h[r]) * (r - l));\n            if (h[l] < h[r]) l++; else r--;\n        }\n        return ans;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49', isHidden: false },
      { input: '[1,1]', expectedOutput: '1', isHidden: true }
    ],
    acceptanceRate: 54.8,
    submissionCount: 890,
    acceptedCount: 488
  },
  {
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    difficulty: 'Easy',
    topics: ['Dynamic Programming', 'Math'],
    description: 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    constraints: [
      '1 <= n <= 45'
    ],
    examples: [
      { input: 'n = 2', output: '2', explanation: '1 step + 1 step, or 2 steps.' },
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, or 2+1.' }
    ],
    starterCode: {
      javascript: 'function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    const temp = a + b;\n    a = b;\n    b = temp;\n  }\n  return b;\n}',
      python: 'class Solution:\n    def climbStairs(self, n: int) -> int:\n        if n <= 2: return n\n        a, b = 1, 2\n        for _ in range(3, n + 1):\n            a, b = b, a + b\n        return b',
      cpp: 'class Solution {\npublic:\n    int climbStairs(int n) {\n        if (n <= 2) return n;\n        int a = 1, b = 2;\n        for (int i = 3; i <= n; ++i) {\n            int c = a + b; a = b; b = c;\n        }\n        return b;\n    }\n};',
      java: 'class Solution {\n    public int climbStairs(int n) {\n        if (n <= 2) return n;\n        int a = 1, b = 2;\n        for (int i = 3; i <= n; i++) {\n            int c = a + b; a = b; b = c;\n        }\n        return b;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '2', expectedOutput: '2', isHidden: false },
      { input: '5', expectedOutput: '8', isHidden: true }
    ],
    acceptanceRate: 52.8,
    submissionCount: 1300,
    acceptedCount: 686
  },
  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'Hard',
    topics: ['Two Pointers', 'Stack'],
    description: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5'
    ],
    examples: [
      { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: '6 units of water are trapped.' }
    ],
    starterCode: {
      javascript: 'function trap(height) {\n  let l = 0, r = height.length - 1, lMax = 0, rMax = 0, total = 0;\n  while (l < r) {\n    if (height[l] < height[r]) {\n      if (height[l] >= lMax) lMax = height[l];\n      else total += lMax - height[l];\n      l++;\n    } else {\n      if (height[r] >= rMax) rMax = height[r];\n      else total += rMax - height[r];\n      r--;\n    }\n  }\n  return total;\n}',
      python: 'class Solution:\n    def trap(self, height: list[int]) -> int:\n        l, r = 0, len(height) - 1\n        l_max, r_max = 0, 0\n        total = 0\n        while l < r:\n            if height[l] < height[r]:\n                if height[l] >= l_max: l_max = height[l]\n                else: total += l_max - height[l]\n                l += 1\n            else:\n                if height[r] >= r_max: r_max = height[r]\n                else: total += r_max - height[r]\n                r -= 1\n        return total',
      cpp: 'class Solution {\npublic:\n    int trap(vector<int>& height) {\n        int l = 0, r = height.size() - 1, lMax = 0, rMax = 0, ans = 0;\n        while (l < r) {\n            if (height[l] < height[r]) {\n                if (height[l] >= lMax) lMax = height[l];\n                else ans += lMax - height[l];\n                l++;\n            } else {\n                if (height[r] >= rMax) rMax = height[r];\n                else ans += rMax - height[r];\n                r--;\n            }\n        }\n        return ans;\n    }\n};',
      java: 'class Solution {\n    public int trap(int[] height) {\n        int l = 0, r = height.length - 1, lMax = 0, rMax = 0, total = 0;\n        while (l < r) {\n            if (height[l] < height[r]) {\n                if (height[l] >= lMax) lMax = height[l];\n                else total += lMax - height[l];\n                l++;\n            } else {\n                if (height[r] >= rMax) rMax = height[r];\n                else total += rMax - height[r];\n                r--;\n            }\n        }\n        return total;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expectedOutput: '6', isHidden: false },
      { input: '[4,2,0,3,2,5]', expectedOutput: '9', isHidden: true }
    ],
    acceptanceRate: 61.2,
    submissionCount: 520,
    acceptedCount: 318
  },
  {
    title: 'Number of Islands',
    slug: 'number-of-islands',
    difficulty: 'Medium',
    topics: ['Graphs', 'Arrays & Hashing'],
    description: 'Given an `m x n` 2D binary grid `grid` which represents a map of "1"s (land) and "0"s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    constraints: [
      'm == grid.length',
      'n == grid[i].length',
      '1 <= m, n <= 300',
      'grid[i][j] is "0" or "1".'
    ],
    examples: [
      { input: 'grid = [["1","1","0"],["1","1","0"],["0","0","1"]]', output: '2', explanation: 'Two distinct islands.' }
    ],
    starterCode: {
      javascript: 'function numIslands(grid) {\n  let count = 0;\n  const dfs = (r, c) => {\n    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] !== "1") return;\n    grid[r][c] = "0";\n    dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1);\n  };\n  for (let r = 0; r < grid.length; r++) {\n    for (let c = 0; c < grid[0].length; c++) {\n      if (grid[r][c] === "1") { count++; dfs(r, c); }\n    }\n  }\n  return count;\n}',
      python: 'class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        if not grid: return 0\n        rows, cols = len(grid), len(grid[0])\n        def dfs(r, c):\n            if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != "1": return\n            grid[r][c] = "0"\n            dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)\n        count = 0\n        for r in range(rows):\n            for c in range(cols):\n                if grid[r][c] == "1": count += 1; dfs(r, c)\n        return count',
      cpp: 'class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        int count = 0;\n        for (int r = 0; r < grid.size(); ++r) {\n            for (int c = 0; c < grid[0].size(); ++c) {\n                if (grid[r][c] == "1") { count++; dfs(grid, r, c); }\n            }\n        }\n        return count;\n    }\n    void dfs(vector<vector<char>>& g, int r, int c) {\n        if (r < 0 || c < 0 || r >= g.size() || c >= g[0].size() || g[r][c] != "1") return;\n        g[r][c] = "0";\n        dfs(g, r+1, c); dfs(g, r-1, c); dfs(g, r, c+1); dfs(g, r, c-1);\n    }\n};',
      java: 'class Solution {\n    public int numIslands(char[][] grid) {\n        int count = 0;\n        for (int r = 0; r < grid.length; r++) {\n            for (int c = 0; c < grid[0].length; c++) {\n                if (grid[r][c] == "1") { count++; dfs(grid, r, c); }\n            }\n        }\n        return count;\n    }\n    void dfs(char[][] g, int r, int c) {\n        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != "1") return;\n        g[r][c] = "0";\n        dfs(g, r+1, c); dfs(g, r-1, c); dfs(g, r, c+1); dfs(g, r, c-1);\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[["1","1","0"],["1","1","0"],["0","0","1"]]', expectedOutput: '2', isHidden: false }
    ],
    acceptanceRate: 57.3,
    submissionCount: 780,
    acceptedCount: 447
  },
  {
    title: 'Course Schedule',
    slug: 'course-schedule',
    difficulty: 'Medium',
    topics: ['Graphs'],
    description: 'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`.\n\nYou are given an array `prerequisites` where `prerequisites[i] = [a_i, b_i]` indicates that you must take course `b_i` first if you want to take course `a_i`.\n\nReturn true if you can finish all courses. Otherwise, return false.',
    constraints: [
      '1 <= numCourses <= 2000',
      '0 <= prerequisites.length <= 5000',
      'prerequisites[i].length == 2'
    ],
    examples: [
      { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true', explanation: 'Course 0 then course 1.' },
      { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false', explanation: 'Cycle detected.' }
    ],
    starterCode: {
      javascript: 'function canFinish(numCourses, prerequisites) {\n  const adj = Array.from({ length: numCourses }, () => []);\n  const indegree = new Array(numCourses).fill(0);\n  for (const [u, v] of prerequisites) {\n    adj[v].push(u);\n    indegree[u]++;\n  }\n  const q = [];\n  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) q.push(i);\n  let visited = 0;\n  while (q.length) {\n    const node = q.shift();\n    visited++;\n    for (const next of adj[node]) {\n      if (--indegree[next] === 0) q.push(next);\n    }\n  }\n  return visited === numCourses;\n}',
      python: 'class Solution:\n    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:\n        from collections import deque, defaultdict\n        adj = defaultdict(list)\n        indegree = [0] * numCourses\n        for u, v in prerequisites:\n            adj[v].append(u)\n            indegree[u] += 1\n        q = deque([i for i in range(numCourses) if indegree[i] == 0])\n        visited = 0\n        while q:\n            node = q.popleft()\n            visited += 1\n            for neighbor in adj[node]:\n                indegree[neighbor] -= 1\n                if indegree[neighbor] == 0: q.append(neighbor)\n        return visited == numCourses',
      cpp: 'class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        vector<vector<int>> adj(numCourses);\n        vector<int> indegree(numCourses, 0);\n        for (auto& p : prerequisites) {\n            adj[p[1]].push_back(p[0]);\n            indegree[p[0]]++;\n        }\n        queue<int> q;\n        for (int i = 0; i < numCourses; ++i) if (indegree[i] == 0) q.push(i);\n        int visited = 0;\n        while (!q.empty()) {\n            int node = q.front(); q.pop(); visited++;\n            for (int next : adj[node]) if (--indegree[next] == 0) q.push(next);\n        }\n        return visited == numCourses;\n    }\n};',
      java: 'class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        List<List<Integer>> adj = new ArrayList<>();\n        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());\n        int[] indegree = new int[numCourses];\n        for (int[] p : prerequisites) {\n            adj.get(p[1]).add(p[0]);\n            indegree[p[0]]++;\n        }\n        Queue<Integer> q = new LinkedList<>();\n        for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.offer(i);\n        int visited = 0;\n        while (!q.isEmpty()) {\n            int node = q.poll(); visited++;\n            for (int next : adj.get(node)) if (--indegree[next] == 0) q.offer(next);\n        }\n        return visited == numCourses;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '2\n[[1,0]]', expectedOutput: 'true', isHidden: false },
      { input: '2\n[[1,0],[0,1]]', expectedOutput: 'false', isHidden: true }
    ],
    acceptanceRate: 46.2,
    submissionCount: 620,
    acceptedCount: 286
  },
  {
    title: 'Binary Target Search',
    slug: 'binary-target-search',
    difficulty: 'Easy',
    topics: ['Binary Search', 'Arrays & Hashing'],
    description: 'Given an array of distinct integers `nums` sorted in ascending order and an integer `target`, implement a binary search to return the index of `target` if found in `nums`, or `-1` if `target` is not present.\n\nYour solution must run in logarithmic O(log n) time complexity.',
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 <= nums[i], target <= 10^4',
      'All elements in nums are strictly unique and sorted in ascending order.'
    ],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 exists in nums and its index is 4.' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1', explanation: '2 does not exist in nums so return -1.' }
    ],
    starterCode: {
      javascript: 'function search(nums, target) {\n  let low = 0, high = nums.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}',
      python: 'class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        low, high = 0, len(nums) - 1\n        while low <= high:\n            mid = (low + high) // 2\n            if nums[mid] == target:\n                return mid\n            elif nums[mid] < target:\n                low = mid + 1\n            else:\n                high = mid - 1\n        return -1',
      cpp: 'class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        int low = 0, high = nums.size() - 1;\n        while (low <= high) {\n            int mid = low + (high - low) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) low = mid + 1;\n            else high = mid - 1;\n        }\n        return -1;\n    }\n};',
      java: 'class Solution {\n    public int search(int[] nums, int target) {\n        int low = 0, high = nums.length - 1;\n        while (low <= high) {\n            int mid = low + (high - low) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) low = mid + 1;\n            else high = mid - 1;\n        }\n        return -1;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', isHidden: false },
      { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', isHidden: false },
      { input: '[5]\n5', expectedOutput: '0', isHidden: true },
      { input: '[1,3,5,7,9]\n10', expectedOutput: '-1', isHidden: true }
    ],
    acceptanceRate: 55.0,
    submissionCount: 420,
    acceptedCount: 231
  },
  {
    title: 'Find Minimum in Rotated Sorted Array',
    slug: 'find-minimum-in-rotated-sorted-array',
    difficulty: 'Medium',
    topics: ['Binary Search', 'Arrays & Hashing'],
    description: 'Suppose an array of length `n` sorted in ascending order is rotated between 1 and `n` times. Given the sorted rotated array `nums` of unique elements, return the minimum element of this array.\n\nYou must write an algorithm that runs in O(log n) time.',
    constraints: [
      'n == nums.length',
      '1 <= n <= 5000',
      '-5000 <= nums[i] <= 5000',
      'All the integers of nums are unique.'
    ],
    examples: [
      { input: 'nums = [3,4,5,1,2]', output: '1', explanation: 'The original array was [1,2,3,4,5] rotated 3 times.' },
      { input: 'nums = [4,5,6,7,0,1,2]', output: '0', explanation: 'The original array was [0,1,2,4,5,6,7] and it was rotated 4 times.' }
    ],
    starterCode: {
      javascript: 'function findMin(nums) {\n  let l = 0, r = nums.length - 1;\n  while (l < r) {\n    const mid = Math.floor((l + r) / 2);\n    if (nums[mid] > nums[r]) l = mid + 1;\n    else r = mid;\n  }\n  return nums[l];\n}',
      python: 'class Solution:\n    def findMin(self, nums: list[int]) -> int:\n        l, r = 0, len(nums) - 1\n        while l < r:\n            mid = (l + r) // 2\n            if nums[mid] > nums[r]:\n                l = mid + 1\n            else:\n                r = mid\n        return nums[l]',
      cpp: 'class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        int l = 0, r = nums.size() - 1;\n        while (l < r) {\n            int mid = l + (r - l) / 2;\n            if (nums[mid] > nums[r]) l = mid + 1;\n            else r = mid;\n        }\n        return nums[l];\n    }\n};',
      java: 'class Solution {\n    public int findMin(int[] nums) {\n        int l = 0, r = nums.length - 1;\n        while (l < r) {\n            int mid = l + (r - l) / 2;\n            if (nums[mid] > nums[r]) l = mid + 1;\n            else r = mid;\n        }\n        return nums[l];\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[3,4,5,1,2]', expectedOutput: '1', isHidden: false },
      { input: '[4,5,6,7,0,1,2]', expectedOutput: '0', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: true },
      { input: '[2,1]', expectedOutput: '1', isHidden: true }
    ],
    acceptanceRate: 48.9,
    submissionCount: 380,
    acceptedCount: 186
  },
  {
    title: 'Maximum Depth of Binary Tree',
    slug: 'maximum-depth-of-binary-tree',
    difficulty: 'Easy',
    topics: ['Trees', 'Depth-First Search'],
    description: 'Given the root of a binary tree represented as an array in level-order traversal, return its maximum depth.\n\nA binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
    constraints: [
      'The number of nodes in the tree is in the range [0, 10^4].',
      '-100 <= Node.val <= 100'
    ],
    examples: [
      { input: 'root = [3,9,20,null,null,15,7]', output: '3', explanation: 'Longest path is 3 -> 20 -> 15 with depth 3.' },
      { input: 'root = [1,null,2]', output: '2', explanation: 'Path is 1 -> 2 with depth 2.' }
    ],
    starterCode: {
      javascript: 'function maxDepth(root) {\n  if (!root) return 0;\n  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}',
      python: 'class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        if not root:\n            return 0\n        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))',
      cpp: 'class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        if (!root) return 0;\n        return 1 + max(maxDepth(root->left), maxDepth(root->right));\n    }\n};',
      java: 'class Solution {\n    public int maxDepth(TreeNode root) {\n        if (root == null) return 0;\n        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[3,9,20,null,null,15,7]', expectedOutput: '3', isHidden: false },
      { input: '[1,null,2]', expectedOutput: '2', isHidden: false },
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[0]', expectedOutput: '1', isHidden: true }
    ],
    acceptanceRate: 74.2,
    submissionCount: 890,
    acceptedCount: 660
  },
  {
    title: 'Validate Binary Search Tree',
    slug: 'validate-binary-search-tree',
    difficulty: 'Medium',
    topics: ['Trees', 'Binary Search Tree', 'Depth-First Search'],
    description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST satisfies the following properties:\n- The left subtree of a node contains only nodes with keys strictly less than the node\'s key.\n- The right subtree of a node contains only nodes with keys strictly greater than the node\'s key.\n- Both the left and right subtrees must also be binary search trees.',
    constraints: [
      'The number of nodes in the tree is in the range [1, 10^4].',
      '-2^31 <= Node.val <= 2^31 - 1'
    ],
    examples: [
      { input: 'root = [2,1,3]', output: 'true', explanation: 'All nodes satisfy BST properties.' },
      { input: 'root = [5,1,4,null,null,3,6]', output: 'false', explanation: 'The root node is 5 but its right child is 4.' }
    ],
    starterCode: {
      javascript: 'function isValidBST(root, min = -Infinity, max = Infinity) {\n  if (!root) return true;\n  if (root.val <= min || root.val >= max) return false;\n  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);\n}',
      python: 'class Solution:\n    def isValidBST(self, root: Optional[TreeNode], floor=float("-inf"), ceiling=float("inf")) -> bool:\n        if not root: return True\n        if root.val <= floor or root.val >= ceiling: return False\n        return self.isValidBST(root.left, floor, root.val) and self.isValidBST(root.right, root.val, ceiling)',
      cpp: 'class Solution {\npublic:\n    bool isValidBST(TreeNode* root, long minVal = LONG_MIN, long maxVal = LONG_MAX) {\n        if (!root) return true;\n        if (root->val <= minVal || root->val >= maxVal) return false;\n        return isValidBST(root->left, minVal, root->val) && isValidBST(root->right, root->val, maxVal);\n    }\n};',
      java: 'class Solution {\n    public boolean isValidBST(TreeNode root) {\n        return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);\n    }\n    private boolean validate(TreeNode node, long min, long max) {\n        if (node == null) return true;\n        if (node.val <= min || node.val >= max) return false;\n        return validate(node.left, min, node.val) && validate(node.right, node.val, max);\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[2,1,3]', expectedOutput: 'true', isHidden: false },
      { input: '[5,1,4,null,null,3,6]', expectedOutput: 'false', isHidden: false },
      { input: '[2,2,2]', expectedOutput: 'false', isHidden: true }
    ],
    acceptanceRate: 32.1,
    submissionCount: 540,
    acceptedCount: 173
  },
  {
    title: 'Middle of the Linked List',
    slug: 'middle-of-the-linked-list',
    difficulty: 'Easy',
    topics: ['Linked Lists', 'Two Pointers'],
    description: 'Given the head of a singly linked list, return the middle node of the linked list.\n\nIf there are two middle nodes, return the second middle node.',
    constraints: [
      'The number of nodes in the list is in the range [1, 100].',
      '1 <= Node.val <= 100'
    ],
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[3,4,5]', explanation: 'The middle node of the list is node 3.' },
      { input: 'head = [1,2,3,4,5,6]', output: '[4,5,6]', explanation: 'Since the list has two middle nodes with values 3 and 4, we return the second one.' }
    ],
    starterCode: {
      javascript: 'function middleNode(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n  }\n  return slow;\n}',
      python: 'class Solution:\n    def middleNode(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        slow = fast = head\n        while fast and fast.next:\n            slow = slow.next\n            fast = fast.next.next\n        return slow',
      cpp: 'class Solution {\npublic:\n    ListNode* middleNode(ListNode* head) {\n        ListNode* slow = head;\n        ListNode* fast = head;\n        while (fast && fast->next) {\n            slow = slow->next;\n            fast = fast->next->next;\n        }\n        return slow;\n    }\n};',
      java: 'class Solution {\n    public ListNode middleNode(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        return slow;\n    }\n}'
    },
    publicationStatus: 'published',
    judgeTestCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[3,4,5]', isHidden: false },
      { input: '[1,2,3,4,5,6]', expectedOutput: '[4,5,6]', isHidden: false },
      { input: '[1]', expectedOutput: '[1]', isHidden: true }
    ],
    acceptanceRate: 76.5,
    submissionCount: 650,
    acceptedCount: 497
  },
  // UNPUBLISHED DRAFT PROBLEM (for testing access restrictions)
  {
    title: 'Alien Dictionary Draft',
    slug: 'alien-dictionary-draft',
    difficulty: 'Hard',
    topics: ['Graphs'],
    description: 'There is a new alien language that uses the English alphabet. You are given a list of words from the alien language dictionary. (Draft problem)',
    constraints: ['1 <= words.length <= 100'],
    examples: [{ input: 'words = ["wrt","wrf"]', output: '"wertf"', explanation: 'Draft example' }],
    starterCode: { javascript: 'function alienOrder(words) { return ""; }' },
    publicationStatus: 'draft',
    judgeTestCases: [
      { input: '["wrt","wrf"]', expectedOutput: '"wertf"', isHidden: true }
    ],
    acceptanceRate: 0,
    submissionCount: 0,
    acceptedCount: 0
  }
];

// Apply clean, unsolved starter templates to all problems
SEED_PROBLEMS.forEach((p) => {
  if (CLEAN_STARTER_CODES[p.slug]) {
    p.starterCode = CLEAN_STARTER_CODES[p.slug];
  }
});

/**
 * Seeds problems into MongoDB database.
 * @returns {Promise<number>} Count of inserted problems
 */
export async function seedProblems() {
  logger.info('Starting problem seed operation...');
  await Problem.deleteMany({});
  const inserted = await Problem.insertMany(SEED_PROBLEMS);
  logger.info(`Successfully seeded ${inserted.length} practice problems.`);
  return inserted.length;
}

/**
 * Seeds demo and admin accounts with secure bcrypt password hashes
 * @returns {Promise<number>} Count of users seeded
 */
export async function seedUsers() {
  logger.info('Starting user seed operation...');
  await User.deleteMany({ email: { $in: ['alex@codearena.dev', 'admin@codearena.dev'] } });

  const adminPasswordHash = await User.hashPassword('AdminPass123!');
  const demoPasswordHash = await User.hashPassword('DemoPass123!');

  const users = await User.insertMany([
    {
      name: 'Alex Chen',
      username: 'alex_coder',
      email: 'alex@codearena.dev',
      passwordHash: demoPasswordHash,
      role: 'user',
      avatarUrl: ''
    },
    {
      name: 'CodeArena Administrator',
      username: 'admin',
      email: 'admin@codearena.dev',
      passwordHash: adminPasswordHash,
      role: 'admin',
      avatarUrl: ''
    }
  ]);

  logger.info(`Successfully seeded ${users.length} accounts (Admin & Demo user).`);
  return users.length;
}

// Standalone execution script runner
async function run() {
  try {
    await connectDB();
    const problemCount = await seedProblems();
    const userCount = await seedUsers();
    console.log(`Seeding complete: ${problemCount} problems and ${userCount} users active in database.`);
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed database', { error: error.message });
    await disconnectDB();
    process.exit(1);
  }
}

// Only execute automatically when run directly via node CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  run();
}

