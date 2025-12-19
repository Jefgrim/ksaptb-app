"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface TourGalleryProps {
  coverImage: string | null;
  galleryImages?: string[];
}

export function TourGallery({ coverImage, galleryImages = [] }: TourGalleryProps) {
  // Combine cover + gallery into one list
  const allImages = [
    ...(coverImage ? [coverImage] : []),
    ...galleryImages,
  ];

  if (allImages.length === 0) {
    return (
      <div className="h-64 mb-6 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        No images available
      </div>
    );
  }

  return (
    <Carousel className="w-full mb-6">
      <CarouselContent>
        {allImages.map((url, index) => (
          <CarouselItem key={index} className="h-64 md:h-96 relative">
            <img
              src={url}
              alt={`Tour image ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      {allImages.length > 1 && (
        <>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </>
      )}
    </Carousel>
  );
}