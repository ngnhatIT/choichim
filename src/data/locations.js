// Các vị trí treo lồng trong ngôi nhà 3D. `x` là tọa độ cây treo lồng trong cảnh.
export const LOCATIONS = {
  san:        { name: 'Ngoài sân', x: -6.6, temporary: true,
                desc: 'Chỗ có nắng trực tiếp, chỉ mang ra khi phơi nắng.' },
  hien:       { name: 'Hiên trước nhà', x: -3.1,
                desc: 'Thoáng, nhiều ánh sáng tự nhiên. Ban đêm cần trùm áo lồng, coi chừng mèo và gió lùa.' },
  phongkhach: { name: 'Phòng khách', x: 1.4,
                desc: 'Kín gió, ấm áp. Gần bàn thờ nên cẩn thận khói nhang; buổi tối đèn, tivi dễ làm chim mất ngủ.' },
  bep:        { name: 'Gần bếp', x: 5.2,
                desc: 'Tiện trông nhưng nguy hiểm: khói dầu mỡ và khí độc từ chảo chống dính bị đun quá nóng.' },
};
export const HOME_SPOTS = ['hien', 'phongkhach', 'bep'];
