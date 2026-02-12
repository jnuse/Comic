use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use std::sync::Mutex;
use zip::ZipArchive;

use crate::file_system::is_image_file;
use crate::image_handler::get_mime_type;

/// ZIP 句柄缓存：只缓存当前正在读的那一个 ZIP
pub struct ZipCache(pub Mutex<Option<(String, ZipArchive<BufReader<File>>)>>);

impl Default for ZipCache {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

/// ZIP 内图片信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZipImageInfo {
    pub index: usize,
    pub name: String,
    pub path: String,
    pub size: u64,
}

/// 获取 ZIP 文件中的图片列表
pub fn get_zip_image_list(zip_path: &str) -> Result<Vec<ZipImageInfo>, String> {
    let path = Path::new(zip_path);
    
    if !path.exists() {
        return Err(format!("ZIP 文件不存在: {}", zip_path));
    }

    let file = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut archive = ZipArchive::new(BufReader::new(file)).map_err(|e| format!("无法读取 ZIP: {}", e))?;

    let mut images: Vec<ZipImageInfo> = Vec::new();

    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index(i) {
            let file_path = file.name().to_string();
            let file_path_obj = Path::new(&file_path);
            
            // 跳过目录和隐藏文件
            if file.is_dir() {
                continue;
            }
            
            if let Some(name) = file_path_obj.file_name() {
                let name_str = name.to_string_lossy().to_string();
                if name_str.starts_with('.') || name_str.starts_with("__MACOSX") {
                    continue;
                }
            }

            // 检查是否为图片文件
            if is_image_file(file_path_obj) {
                let name = file_path_obj
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| file_path.clone());

                images.push(ZipImageInfo {
                    index: i,
                    name,
                    path: file_path,
                    size: file.size(),
                });
            }
        }
    }

    // 自然排序
    images.sort_by(|a, b| natord::compare(&a.name, &b.name));

    // 重新分配索引
    for (i, img) in images.iter_mut().enumerate() {
        img.index = i;
    }

    Ok(images)
}

/// 从 ZIP 文件中读取指定图片的数据（Base64），复用缓存的 ZIP 句柄
pub fn read_zip_image(zip_path: &str, image_path: &str, cache: &ZipCache) -> Result<String, String> {
    let path = Path::new(zip_path);

    if !path.exists() {
        return Err(format!("ZIP 文件不存在: {}", zip_path));
    }

    let mut guard = cache.0.lock().map_err(|e| format!("锁获取失败: {}", e))?;

    // 如果缓存的不是当前 ZIP，替换
    let need_open = match guard.as_ref() {
        Some((cached_path, _)) => cached_path != zip_path,
        None => true,
    };

    if need_open {
        let file = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
        let archive = ZipArchive::new(BufReader::new(file))
            .map_err(|e| format!("无法读取 ZIP: {}", e))?;
        *guard = Some((zip_path.to_string(), archive));
    }

    let (_, archive) = guard.as_mut().unwrap();

    let mut zip_file = archive
        .by_name(image_path)
        .map_err(|e| format!("无法找到图片: {}", e))?;

    let mut buffer = Vec::new();
    zip_file
        .read_to_end(&mut buffer)
        .map_err(|e| format!("无法读取图片数据: {}", e))?;

    let mime_type = get_mime_type(image_path);
    let base64_data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &buffer);

    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// 批量读取 ZIP 中的图片
pub fn read_zip_images_batch(
    zip_path: &str,
    image_paths: Vec<String>,
) -> Result<Vec<(String, String)>, String> {
    let path = Path::new(zip_path);
    
    if !path.exists() {
        return Err(format!("ZIP 文件不存在: {}", zip_path));
    }

    let file = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("无法读取 ZIP: {}", e))?;

    let mut results: Vec<(String, String)> = Vec::new();

    for image_path in image_paths {
        if let Ok(mut zip_file) = archive.by_name(&image_path) {
            let mut buffer = Vec::new();
            if zip_file.read_to_end(&mut buffer).is_ok() {
                let mime_type = get_mime_type(&image_path);
                let base64_data = base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    &buffer,
                );
                results.push((
                    image_path,
                    format!("data:{};base64,{}", mime_type, base64_data),
                ));
            }
        }
    }

    Ok(results)
}
