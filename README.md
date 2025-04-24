<p align="center">
  <img src="./assets/briefcase-72.png" />
</p>

# Visual Studio Code Working Sets

Conveniently manage "working sets" of files. This extension allows you to create, delete, add/remove files to, and switch between working sets with ease.

## Features

### Persistent Files Across Git Branches

Files in working sets now persist when switching between git branches, even if the files don't exist in some branches. When you switch to a branch where a file doesn't exist:

- The file remains in your working set with a visual indicator showing it's missing
- When you switch back to a branch where the file exists, it will be available again
- Attempting to open a missing file shows a helpful message instead of an error
- Working sets automatically refresh when git branches change (when Git is available)
- Manual refresh buttons for working sets are available in the Working Sets view
- File existence is checked dynamically as needed
- Warning icons clearly indicate files that don't exist in the current branch

This makes working sets much more useful when working across different feature branches!

### Available Commands in Command Palette

- `Working Sets: Create`
- `Working Sets: Delete`
- `Working Sets: Add Active Editor to Working Set`
- `Working Sets: Open All Files in Working Set`
- `Working Sets: Remove File from Working Set`
- `Working Sets: Add All Open Editors to Working Set`
- `Working Sets: Sort Working Sets in Ascending Order`
- `Working Sets: Sort Working Sets in Descending Order`
- `Working Sets: Sort Files in Ascending Order`
- `Working Sets: Sort Files in Descending Order`
- `Working Sets: Refresh After Branch Change`

### Create a Working Set

Create an empty Working Set from the Working Sets sidebar view.

![Create Working Set](./assets/create.png)

You can also use the `Working Sets: Create` command.

### Add Files to a Working Sets

Add all open editors to a Working Set.

![Add Open Editors](./assets/add-files.png)

You can also use the `Working Sets: Add All Open Editors to Working Set` command.

---

Add the active editor to a Working Set.

![Add Active Editor](./assets/add-file-1.png)

You can also use the `Working Sets: Add Active Editor to Working Set` command.

---

Add a file from the Explorer context menu.

![Add Active Editor from Context Menu](./assets/add-file-2.png)

### Open an Existing Working Set

Open all the editors in a Working Set from the Working Sets sidebar view.

![Open Working Set](./assets/open.png)

You can also use the `Working Sets: Open All Files in Working Set` commmand.

### Remove a File from a Working Set

Remove a file from a Working Set from the Working Sets sidebar view.

![Remove File](./assets/remove-file.png)

You can also use the `Working Sets: Remove File from Working Set` command.

### Delete a Working Set

Delete a Working Set from the Working Sets sidebar view.

![Delete Working Set](./assets/delete.png)

You can also use the `Working Sets: Delete` command.

### Sort Working Sets

Sort Working Sets (Ascending or Descending) from `...` menu in Working Sets sidebar view title.

![Sort Working Sets](./assets/sort-sets.png)

You can also use the following commands:

- `Working Sets: Sort Working Sets in Ascending Order`
- `Working Sets: Sort Working Sets in Descending Order`

### Sort Files within a Working Sets

Sort files in a Working Sets (Ascending or Descending)

![Sort Files in Working Sets](./assets/sort-files.png)

You can also use the following commands:

- `Working Sets: Sort Files in Ascending Order`
- `Working Sets: Sort Files in Descending Order`

### Move Files Manually within a Working Sets

Move files in a Working Sets (Up or Down)

![Move Files in Working Sets](./assets/move-files.png)

## Extension Settings

| Key                                      | Default | Description                                                                                              |
| ---------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `workingSets.confirmOnDelete`            | `true`  | Show confirmation popup when deleting a Working Set                                                      |
| `workingSets.saveWorkingSetsInWorkspace` | `false` | Save (and restore) working sets locally in the current workspace (.vscode directory) instead of globally |
| `workingSets.showNotifications`          | `false` | Show confirmation notifications after every action                                                       |
