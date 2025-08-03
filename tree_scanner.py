#!/usr/bin/env python3
"""
file: tree_scanner.py
Directory Tree Scanner with Line Counting
Python version of the JavaScript tree generator

USAGE EXAMPLES:
==============

Basic Usage:
  python tree_scanner.py                           # Scan current directory → tree.txt
  python tree_scanner.py /path/to/project          # Scan specific directory
  python tree_scanner.py -o my_structure.txt       # Custom output file

For Code Projects:
  python tree_scanner.py --extensions ".py"        # Only Python files
  python tree_scanner.py --extensions ".py,.js,.html,.css"  # Multiple types
  python tree_scanner.py --count-all               # All text files

Exclude Directories:
  python tree_scanner.py --exclude "temp"          # Exclude temp directory
  python tree_scanner.py --exclude "logs" --exclude "backup"  # Multiple excludes

Network Scanner Project Examples:
  python tree_scanner.py --extensions ".py,.json,.md" -o scanner_structure.txt
  python tree_scanner.py --exclude "web" --exclude "logs" --extensions ".py"

Quick Reference:
  -o, --output FILE         Output filename (default: tree.txt)
  --exclude DIR             Exclude directory/file (can use multiple times)
  --extensions .ext1,.ext2  File extensions to count lines for
  --count-all              Count lines in all text files
  --no-stats               Don't show statistics at end
  -h, --help               Show full help

Default Excludes: "node_modules", ".git", ".ruff_cache", "docs", ".github", "public", "__pycache__",
            ".vscode", ".idea", "dist", "build", "logs", ".pytest_cache", "venv"

Default Line Counting: '.py', '.js', '.ts', '.tsx', '.dart', '.java', '.cpp', '.c', '.h',
            '.html', '.css', '.json', '.yaml', '.yml'
"""

import sys
from pathlib import Path
from typing import Set, Optional
import argparse

class TreeScanner:
    def __init__(self, 
                 excludes: Optional[Set[str]] = None,
                 count_lines_for: Optional[Set[str]] = None,
                 count_all_files: bool = False):
        """
        Initialize tree scanner
        
        Args:
            excludes: Set of directory/file names to exclude
            count_lines_for: Set of file extensions to count lines for (e.g., {'.py', '.js'})
            count_all_files: If True, count lines for all text files
        """
        self.excludes = excludes or {
            "node_modules", ".git", ".ruff_cache", "docs", ".github", "public", "__pycache__",
            ".vscode", ".idea", "dist", "build", "logs", ".pytest_cache", "venv"
        }
        
        self.count_lines_for = count_lines_for or {
            '.py', '.js', '.ts', '.tsx', '.dart', '.java', '.cpp', '.c', '.h',
            '.html', '.css', '.json', '.yaml', '.yml'
        }
        
        self.count_all_files = count_all_files
        self.output_lines = []
        self.stats = {
            'total_files': 0,
            'total_dirs': 0,
            'files_with_lines': 0,
            'total_lines': 0
        }
    
    def count_lines(self, file_path: Path) -> int:
        """Count lines in a file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                # Count non-empty lines (change to len(lines) for all lines including empty)
                lines = [line for line in f.readlines() if line.strip()]
                return len(lines)
        except (UnicodeDecodeError, PermissionError, OSError):
            # Try with different encoding or skip binary files
            try:
                with open(file_path, 'r', encoding='latin-1', errors='ignore') as f:
                    lines = [line for line in f.readlines() if line.strip()]
                    return len(lines)
            except:
                return 0
    
    def should_count_lines(self, file_path: Path) -> bool:
        """Determine if we should count lines for this file"""
        if self.count_all_files:
            return True
        
        return file_path.suffix.lower() in self.count_lines_for
    
    def is_text_file(self, file_path: Path) -> bool:
        """Check if file is likely a text file"""
        text_extensions = {
            '.py', '.js', '.ts', '.tsx', '.html', '.css', '.md', '.txt', '.json',
            '.yaml', '.yml', '.xml', '.csv', '.log', '.ini', '.cfg', '.sql',
            '.dart', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go'
        }
        
        if file_path.suffix.lower() in text_extensions:
            return True
        
        # Check for files without extensions that might be text
        if not file_path.suffix:
            text_names = {'README', 'LICENSE', 'CHANGELOG', 'Dockerfile', 'Makefile'}
            if file_path.name in text_names:
                return True
        
        return False
    
    async def scan_directory(self, directory: Path, prefix: str = "") -> None:
        """Recursively scan directory and build tree"""
        try:
            items = sorted(directory.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
        except PermissionError:
            return
        
        # Filter out excluded items
        items = [item for item in items if item.name not in self.excludes]
        
        for i, item in enumerate(items):
            is_last = i == len(items) - 1
            pointer = "└── " if is_last else "├── "
            
            if item.is_dir():
                self.stats['total_dirs'] += 1
                self.output_lines.append(f"{prefix}{pointer}{item.name}/")
                
                # Recurse into subdirectory
                next_prefix = prefix + ("    " if is_last else "│   ")
                await self.scan_directory(item, next_prefix)
                
            else:
                self.stats['total_files'] += 1
                display_name = item.name
                
                # Add line count if applicable
                if self.should_count_lines(item) and self.is_text_file(item):
                    line_count = self.count_lines(item)
                    if line_count > 0:
                        display_name += f" ({line_count} lines)"
                        self.stats['files_with_lines'] += 1
                        self.stats['total_lines'] += line_count
                
                self.output_lines.append(f"{prefix}{pointer}{display_name}")
    
    def scan_directory_sync(self, directory: Path, prefix: str = "") -> None:
        """Synchronous version of scan_directory"""
        try:
            items = sorted(directory.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
        except PermissionError:
            return
        
        # Filter out excluded items
        items = [item for item in items if item.name not in self.excludes]
        
        for i, item in enumerate(items):
            is_last = i == len(items) - 1
            pointer = "└── " if is_last else "├── "
            
            if item.is_dir():
                self.stats['total_dirs'] += 1
                self.output_lines.append(f"{prefix}{pointer}{item.name}/")
                
                # Recurse into subdirectory
                next_prefix = prefix + ("    " if is_last else "│   ")
                self.scan_directory_sync(item, next_prefix)
                
            else:
                self.stats['total_files'] += 1
                display_name = item.name
                
                # Add line count if applicable
                if self.should_count_lines(item) and self.is_text_file(item):
                    line_count = self.count_lines(item)
                    if line_count > 0:
                        display_name += f" ({line_count} lines)"
                        self.stats['files_with_lines'] += 1
                        self.stats['total_lines'] += line_count
                
                self.output_lines.append(f"{prefix}{pointer}{display_name}")
    
    def generate_tree(self, root_path: Path, output_file: str = "tree.txt") -> str:
        """Generate the complete directory tree"""
        self.output_lines = []
        self.stats = {'total_files': 0, 'total_dirs': 0, 'files_with_lines': 0, 'total_lines': 0}
        
        # Add root directory
        self.output_lines.append(f"{root_path.name}/")
        
        # Scan the directory structure
        self.scan_directory_sync(root_path)
        
        # Add statistics at the end
        self.output_lines.append("")
        self.output_lines.append("=" * 50)
        self.output_lines.append("DIRECTORY TREE STATISTICS")
        self.output_lines.append("=" * 50)
        self.output_lines.append(f"Total directories: {self.stats['total_dirs']}")
        self.output_lines.append(f"Total files: {self.stats['total_files']}")
        self.output_lines.append(f"Files with line counts: {self.stats['files_with_lines']}")
        self.output_lines.append(f"Total lines of code: {self.stats['total_lines']:,}")
        
        # Add configuration info
        self.output_lines.append("")
        self.output_lines.append("Configuration:")
        self.output_lines.append(f"  Excluded directories: {', '.join(sorted(self.excludes))}")
        if not self.count_all_files:
            self.output_lines.append(f"  Line counting for: {', '.join(sorted(self.count_lines_for))}")
        else:
            self.output_lines.append("  Line counting: All text files")
        
        # Save to file
        content = "\n".join(self.output_lines)
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Directory tree saved to: {output_file}")
        except Exception as e:
            print(f"❌ Failed to save to {output_file}: {e}")
        
        return content

def main():
    parser = argparse.ArgumentParser(description="Generate directory tree with line counting")
    parser.add_argument("path", nargs="?", default=".", 
                       help="Directory to scan (default: current directory)")
    parser.add_argument("-o", "--output", default="tree.txt",
                       help="Output file name (default: tree.txt)")
    parser.add_argument("--exclude", action="append", default=[],
                       help="Additional directories/files to exclude")
    parser.add_argument("--extensions", 
                       help="Comma-separated list of file extensions to count (e.g., '.py,.js,.html')")
    parser.add_argument("--count-all", action="store_true",
                       help="Count lines for all text files")
    parser.add_argument("--no-stats", action="store_true",
                       help="Don't include statistics at the end")
    
    args = parser.parse_args()
    
    # Setup path
    root_path = Path(args.path).resolve()
    if not root_path.exists():
        print(f"❌ Error: Path '{args.path}' does not exist")
        sys.exit(1)
    
    if not root_path.is_dir():
        print(f"❌ Error: Path '{args.path}' is not a directory")
        sys.exit(1)
    
    # Setup excludes
    default_excludes = {
        "node_modules", ".git", ".ruff_cache", "docs", ".github", "public", "__pycache__",
            ".vscode", ".idea", "dist", "build", "logs", ".pytest_cache", "venv"
    }
    custom_excludes = set(args.exclude) if args.exclude else set()
    all_excludes = default_excludes | custom_excludes
    
    # Setup file extensions
    count_lines_for = None
    if args.extensions:
        count_lines_for = {ext.strip() for ext in args.extensions.split(',')}
        # Ensure extensions start with a dot
        count_lines_for = {ext if ext.startswith('.') else f'.{ext}' for ext in count_lines_for}
    
    # Create scanner
    scanner = TreeScanner(
        excludes=all_excludes,
        count_lines_for=count_lines_for,
        count_all_files=args.count_all
    )
    
    print(f"🔍 Scanning directory: {root_path}")
    print(f"📁 Excluding: {', '.join(sorted(all_excludes))}")
    
    if args.count_all:
        print("📊 Counting lines for: All text files")
    elif count_lines_for:
        print(f"📊 Counting lines for: {', '.join(sorted(count_lines_for))}")
    else:
        print(f"📊 Counting lines for: {', '.join(sorted(scanner.count_lines_for))}")
    
    # Generate tree
    content = scanner.generate_tree(root_path, args.output)
    
    # Display summary
    print("\n📊 Summary:")
    print(f"   Directories: {scanner.stats['total_dirs']}")
    print(f"   Files: {scanner.stats['total_files']}")
    print(f"   Files with line counts: {scanner.stats['files_with_lines']}")
    print(f"   Total lines: {scanner.stats['total_lines']:,}")

if __name__ == "__main__":
    main()