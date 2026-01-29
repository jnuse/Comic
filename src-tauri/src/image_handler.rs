use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// 图片信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInfo {
    pub index: usize,
    pub name: String,
    pub path: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

/// 获取图片尺寸
pub fn get_image_dimensions(path: &str) -> Result<(u32, u32), String> {
    let img = image::open(path).map_err(|e| format!("无法打开图片: {}", e))?;
    Ok((img.width(), img.height()))
}

/// 读取图片文件并返回 Base64 Data URL
pub fn read_image_as_base64(path: &str) -> Result<String, String> {
    let path_obj = Path::new(path);
    
    if !path_obj.exists() {
        return Err(format!("图片不存在: {}", path));
    }

    let data = fs::read(path).map_err(|e| format!("无法读取图片: {}", e))?;
    let mime_type = get_mime_type(path);
    let base64_data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
    
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// 批量读取图片
pub fn read_images_batch(paths: Vec<String>) -> Vec<(String, Result<String, String>)> {
    paths
        .into_iter()
        .map(|path| {
            let result = read_image_as_base64(&path);
            (path, result)
        })
        .collect()
}

/// 获取 MIME 类型
fn get_mime_type(path: &str) -> &'static str {
    let path = Path::new(path);
    match path.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).as_deref() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("tiff") | Some("tif") => "image/tiff",
        _ => "application/octet-stream",
    }
}

/// 生成缩略图
pub fn generate_thumbnail(path: &str, max_width: u32, max_height: u32) -> Result<String, String> {
    let img = image::open(path).map_err(|e| format!("无法打开图片: {}", e))?;
    
    let thumbnail = img.thumbnail(max_width, max_height);
    
    let mut buffer = Vec::new();
    thumbnail
        .write_to(
            &mut std::io::Cursor::new(&mut buffer),
            image::ImageFormat::Jpeg,
        )
        .map_err(|e| format!("无法生成缩略图: {}", e))?;
    
    let base64_data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &buffer);
    Ok(format!("data:image/jpeg;base64,{}", base64_data))
}

/// 分块读取大图片（用于超长条漫）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageChunk {
    pub index: usize,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub data: String,
}

/// 将图片分块
pub fn split_image_to_chunks(
    path: &str,
    chunk_height: u32,
) -> Result<Vec<ImageChunk>, String> {
    let img = image::open(path).map_err(|e| format!("无法打开图片: {}", e))?;
    
    let width = img.width();
    let height = img.height();
    
    // 如果图片不是很高，直接返回整张图片
    if height <= chunk_height * 2 {
        let base64_data = read_image_as_base64(path)?;
        return Ok(vec![ImageChunk {
            index: 0,
            x: 0,
            y: 0,
            width,
            height,
            data: base64_data,
        }]);
    }

    let mut chunks = Vec::new();
    let mut y = 0u32;
    let mut index = 0usize;

    while y < height {
        let current_height = (chunk_height).min(height - y);
        
        let chunk_img = img.crop_imm(0, y, width, current_height);
        
        let mut buffer = Vec::new();
        chunk_img
            .write_to(
                &mut std::io::Cursor::new(&mut buffer),
                image::ImageFormat::Jpeg,
            )
            .map_err(|e| format!("无法处理图片块: {}", e))?;
        
        let base64_data = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &buffer,
        );
        
        chunks.push(ImageChunk {
            index,
            x: 0,
            y,
            width,
            height: current_height,
            data: format!("data:image/jpeg;base64,{}", base64_data),
        });
        
        y += current_height;
        index += 1;
    }

    Ok(chunks)
}
