# Records each project's thumbnail size as page.thumb_width / page.thumb_height
# (EXIF orientation applied), so the homepage grid knows every photo's shape
# before any image downloads.
require "fastimage"

module ThumbDims
  class Generator < Jekyll::Generator
    priority :high

    def generate(site)
      projects = site.collections["projects"]
      return unless projects

      projects.docs.each do |doc|
        src = doc.data["featured_image"]
        next unless src.is_a?(String) && !src.empty?

        path = File.join(site.source, src.sub(%r{\A/}, ""))
        size = FastImage.size(path) if File.file?(path)
        if size
          doc.data["thumb_width"], doc.data["thumb_height"] = size
        else
          Jekyll.logger.warn "ThumbDims:", "can't read size of #{src} (#{doc.relative_path})"
        end
      end
    end
  end
end
