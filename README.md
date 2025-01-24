# PrivaFile

PrivaFile is a desktop application specifically designed for Linux that enables secure file encryption. Developed and tested on Ubuntu, it offers a robust solution for protecting sensitive data.

## System Requirements

- Operating System: Linux (Tested on Ubuntu 22.04 LTS and higher)
- Architecture: x64
- Disk Space: 100MB minimum
- RAM: 512MB minimum

## Key Features

- File encryption using AES-256 algorithms
- Modern graphical interface optimized for Linux environments
- Automatic updates through GitHub
- Support for files of any format
- Integrated dark mode

## Installation

### Method 1: Installation via .deb package
```bash
sudo dpkg -i privafile_1.0.0.deb
sudo apt-get install -f # To resolve dependencies if needed
```

### Method 2: Installation via AppImage
```bash
chmod +x PrivaFile-1.0.0.AppImage
./PrivaFile-1.0.0.AppImage
```

## Usage

1. Launch PrivaFile from the applications menu or via command:
   ```bash
   privafile
   ```

2. To encrypt a file:
   - Select the file using the "Browse" button
   - Enter a secure password
   - Press "Encrypt"

3. To decrypt a file:
   - Select the .encrypted file
   - Enter the corresponding password
   - Press "Decrypt"

## Security

PrivaFile implements the following security measures:

- AES-256 encryption for maximum protection
- Passwords are never stored on disk
- No external server connections except for updates
- File integrity verification

## Technical Support

### Known Issues
- Application requires write permissions in the destination directory
- Not compatible with 32-bit systems

### Troubleshooting
If you encounter any errors, verify:
1. Proper user permissions
2. Sufficient disk space
3. Updated system

## Development

This project is developed and maintained by staFF6773. To contribute:

1. Make sure you have Node.js and npm installed
2. Clone the repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. For local development:
   ```bash
   npm run dev
   ```

## License

GPL-3.0 license

Copyright (c) 2025 staFF6773

## Contact

- Developer: staFF6773
- Email: notstaffof@gmail.com
- GitHub: https://github.com/staFF6773/privafile
