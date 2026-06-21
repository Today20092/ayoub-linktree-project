export type RemoteEventGalleryImage = {
  src: string
  width: number
  height: number
  alt: string
  filename: string
  featured: boolean
}

type PhotoSpec = {
  filename: string
  width: number
  height: number
}

const photoRange = (
  prefix: string,
  start: number,
  end: number,
  width: number,
  height: number,
): PhotoSpec[] =>
  Array.from({ length: end - start + 1 }, (_, index) => {
    const number = start + index

    return {
      filename: `${prefix}${number}.jpg`,
      width,
      height,
    }
  })

const sanadFeatured = new Set([
  'P1301034.jpg',
  'P1301041.jpg',
  'P1301055.jpg',
  'P1301064.jpg',
  'P1301095.jpg',
  'P1301112.jpg',
  'P1301158.jpg',
  'P1301180.jpg',
  'P1301195.jpg',
  'P1301202.jpg',
  'P1301225.jpg',
  'P1301272.jpg',
])

const sanadPhotoSpecs = [
  ...photoRange('P130', 1034, 1036, 2400, 1600),
  ...photoRange('P130', 1037, 1040, 1600, 2400),
  ...photoRange('P130', 1041, 1042, 2400, 1600),
  ...photoRange('P130', 1043, 1050, 1600, 2400),
  ...photoRange('P130', 1051, 1052, 2400, 1600),
  ...photoRange('P130', 1053, 1054, 1600, 2400),
  ...photoRange('P130', 1055, 1066, 2400, 1600),
  ...photoRange('P130', 1067, 1084, 1600, 2400),
  ...photoRange('P130', 1085, 1087, 2400, 1600),
  ...photoRange('P130', 1088, 1093, 1600, 2400),
  ...photoRange('P130', 1094, 1096, 2400, 1600),
  ...photoRange('P130', 1097, 1111, 1600, 2400),
  ...photoRange('P130', 1112, 1116, 2400, 1600),
  ...photoRange('P130', 1117, 1153, 1600, 2400),
  ...photoRange('P130', 1154, 1158, 2400, 1600),
  ...photoRange('P130', 1159, 1179, 1600, 2400),
  ...photoRange('P130', 1180, 1188, 2400, 1600),
  ...photoRange('P130', 1190, 1202, 2400, 1600),
  ...photoRange('P130', 1203, 1205, 1600, 2400),
  ...photoRange('P130', 1206, 1211, 2400, 1600),
  ...photoRange('P130', 1212, 1223, 1600, 2400),
  ...photoRange('P130', 1224, 1228, 2400, 1600),
  ...photoRange('P130', 1271, 1273, 2400, 1600),
  ...photoRange('P131', 1315, 1318, 2400, 1600),
]

export const eventGalleries: Record<string, RemoteEventGalleryImage[]> = {
  'sanad-silwadi-wedding': sanadPhotoSpecs.map((photo, index) => ({
    ...photo,
    src: `https://photos.ayoubabed.xyz/events/sanad-silwadi-06-20-2026/images/${photo.filename}`,
    alt: `Sanad Silwadi wedding celebration photograph ${index + 1}`,
    featured: sanadFeatured.has(photo.filename),
  })),
}
