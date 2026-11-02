// Các vị trí treo lồng trong ngôi nhà 3D. `x`, `z` là tọa độ chân cây treo lồng trong cảnh:
// sân gạch trước nhà, hiên gian trái, trong gian trái (cạnh gian thờ), nhà ngang làm bếp phía sau.
export const LOCATIONS = {
  san:        { name: 'Ngoài sân', x: -5.0, z: 4.4, temporary: true,
                desc: 'Chỗ có nắng trực tiếp, chỉ mang ra khi phơi nắng.' },
  hien:       { name: 'Hiên trước nhà', x: -4.2, z: 0.75,
                desc: 'Thoáng, nhiều ánh sáng tự nhiên. Ban đêm cần trùm áo lồng, coi chừng mèo và gió lùa.' },
  phongkhach: { name: 'Phòng khách', x: -3.8, z: -3.2,
                desc: 'Kín gió, ấm áp. Gần bàn thờ nên cẩn thận khói nhang; buổi tối đèn, tivi dễ làm chim mất ngủ.' },
  bep:        { name: 'Gần bếp', x: 6.9, z: -4.6,
                desc: 'Tiện trông nhưng nguy hiểm: khói dầu mỡ và khí độc từ chảo chống dính bị đun quá nóng.' },
};
export const HOME_SPOTS = ['hien', 'phongkhach', 'bep'];
