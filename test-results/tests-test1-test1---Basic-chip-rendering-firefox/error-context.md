# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - text: "Select Options:"
    - listbox "Select Options:" [ref=e3]:
      - option "Option 1" [selected] [ref=e4]
      - option "Option 2" [ref=e5]
      - option "Option 3" [ref=e6]
  - 'group "Select Options: ✕" [ref=e8]':
    - generic [ref=e9]:
      - text: "Select Options:"
      - button "✕" [ref=e10] [cursor=pointer]
    - generic [ref=e11]:
      - generic [ref=e12]: Option 1
      - button "Remove" [ref=e13] [cursor=pointer]: ✕
```