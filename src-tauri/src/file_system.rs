use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// 支持的图片格式
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

/// 文件节点结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(rename = "isComic")]
    pub is_comic: bool,
    #[serde(rename = "isZip")]
    pub is_zip: bool,
    #[serde(rename = "imageCount")]
    pub image_count: u32,
    pub children: Option<Vec<FileNode>>,
}

/// 检查文件是否为图片
pub fn is_image_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        return IMAGE_EXTENSIONS.contains(&ext_lower.as_str());
    }
    false
}

/// 检查文件是否为 ZIP
pub fn is_zip_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        return ext_lower == "zip" || ext_lower == "cbz";
    }
    false
}

/// 使用自然排序对文件节点排序
fn sort_nodes(nodes: &mut [FileNode]) {
    nodes.sort_by(|a, b| {
        // 文件夹优先
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => natord::compare(&a.name, &b.name),
        }
    });
}

/// 检查目录是否包含图片文件
pub fn directory_has_images(path: &Path) -> (bool, u32) {
    let mut count = 0u32;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() && is_image_file(&entry_path) {
                count += 1;
            }
        }
    }
    (count > 0, count)
}

/// 扫描目录并构建文件树
pub fn scan_directory(path: &str, depth: u32, max_depth: u32) -> Result<FileNode, String> {
    let path = Path::new(path);
    
    if !path.exists() {
        return Err(format!("路径不存在: {}", path.display()));
    }

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    // 如果是文件
    if path.is_file() {
        let is_zip = is_zip_file(path);
        return Ok(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: false,
            is_comic: is_zip,
            is_zip,
            image_count: 0,
            children: None,
        });
    }

    // 如果是目录
    let (has_direct_images, direct_image_count) = directory_has_images(path);
    
    // 判断是否为漫画目录（直接包含图片）
    let is_comic = has_direct_images;

    // 如果达到最大深度，不再递归
    if depth >= max_depth {
        return Ok(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory: true,
            is_comic,
            is_zip: false,
            image_count: direct_image_count,
            children: None,
        });
    }

    // 读取目录内容
    let mut children = Vec::new();
    
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            let entry_name = entry.file_name().to_string_lossy().to_string();
            
            // 跳过隐藏文件
            if entry_name.starts_with('.') {
                continue;
            }

            if entry_path.is_dir() {
                // 递归扫描子目录
                if let Ok(child_node) = scan_directory(
                    &entry_path.to_string_lossy(),
                    depth + 1,
                    max_depth,
                ) {
                    children.push(child_node);
                }
            } else if entry_path.is_file() {
                // 只添加 ZIP 文件，不添加单独的图片文件
                if is_zip_file(&entry_path) {
                    children.push(FileNode {
                        name: entry_name,
                        path: entry_path.to_string_lossy().to_string(),
                        is_directory: false,
                        is_comic: true,
                        is_zip: true,
                        image_count: 0,
                        children: None,
                    });
                }
            }
        }
    }

    // 排序
    sort_nodes(&mut children);

    Ok(FileNode {
        name,
        path: path.to_string_lossy().to_string(),
        is_directory: true,
        is_comic,
        is_zip: false,
        image_count: direct_image_count,
        children: if children.is_empty() {
            None
        } else {
            Some(children)
        },
    })
}

/// 获取目录中的图片列表
pub fn get_images_in_directory(path: &str) -> Result<Vec<String>, String> {
    let path = Path::new(path);
    
    if !path.exists() || !path.is_dir() {
        return Err(format!("目录不存在: {}", path.display()));
    }

    let mut images: Vec<String> = Vec::new();
    
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_file() && is_image_file(&entry_path) {
                images.push(entry_path.to_string_lossy().to_string());
            }
        }
    }

    // 自然排序
    images.sort_by(|a, b| {
        let name_a = Path::new(a).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        let name_b = Path::new(b).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        natord::compare(&name_a, &name_b)
    });

    Ok(images)
}
