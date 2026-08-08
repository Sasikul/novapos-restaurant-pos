const Menu = require("../models/Menu");

const stations = [
  "ครัวทั่วไป",
  "เตาผัด",
  "เตาต้ม",
  "เตาย่าง",
  "ทอด",
  "ส้มตำ",
  "เครื่องดื่ม",
  "ของหวาน",
];

const defaultMenus = [
  { name: "ข้าวกะเพราหมูสับ", price: 55, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวกะเพราไก่", price: 55, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวกะเพราเนื้อ", price: 70, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวผัดหมู", price: 55, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวผัดกุ้ง", price: 70, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวไข่เจียวหมูสับ", price: 45, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวหมูกระเทียม", price: 60, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวไก่กระเทียม", price: 55, category: "อาหาร", station: "เตาผัด" },
  { name: "ข้าวคะน้าหมูกรอบ", price: 70, category: "อาหาร", station: "เตาผัด" },
  { name: "ผัดไทยกุ้งสด", price: 75, category: "อาหาร", station: "เตาผัด" },
  { name: "ราดหน้าหมู", price: 60, category: "อาหาร", station: "เตาผัด" },
  { name: "สุกี้น้ำหมู", price: 65, category: "อาหาร", station: "เตาต้ม" },
  { name: "ต้มยำกุ้ง", price: 120, category: "อาหาร", station: "เตาต้ม" },
  { name: "แกงจืดเต้าหู้หมูสับ", price: 80, category: "อาหาร", station: "เตาต้ม" },
  { name: "ส้มตำไทย", price: 55, category: "อาหาร", station: "ส้มตำ" },
  { name: "ไก่ย่าง", price: 95, category: "อาหาร", station: "เตาย่าง" },
  { name: "หมูย่างจิ้มแจ่ว", price: 95, category: "อาหาร", station: "เตาย่าง" },
  { name: "เนื้อย่าง", price: 120, category: "อาหาร", station: "เตาย่าง" },
  { name: "ไก่ทอด", price: 85, category: "อาหาร", station: "ทอด" },
  { name: "หมูทอดน้ำปลา", price: 95, category: "อาหาร", station: "ทอด" },
  { name: "เฟรนช์ฟรายส์", price: 55, category: "อาหาร", station: "ทอด" },
  { name: "ไข่ดาว", price: 12, category: "อาหาร", station: "เตาผัด" },
  { name: "ไข่เจียว", price: 15, category: "อาหาร", station: "เตาผัด" },
  { name: "น้ำเปล่า", price: 10, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "น้ำแข็งเปล่า", price: 5, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "ชาเย็น", price: 35, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "ชาเขียวเย็น", price: 40, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "กาแฟเย็น", price: 40, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "โกโก้เย็น", price: 40, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "นมชมพู", price: 35, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "โอเลี้ยง", price: 30, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "น้ำแดงโซดา", price: 35, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "น้ำมะนาวโซดา", price: 45, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "โค้ก", price: 20, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "สไปรท์", price: 20, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "น้ำส้ม", price: 25, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "น้ำเก๊กฮวย", price: 25, category: "เครื่องดื่ม", station: "เครื่องดื่ม" },
  { name: "บัวลอย", price: 35, category: "ของหวาน", station: "ของหวาน" },
  { name: "เฉาก๊วย", price: 30, category: "ของหวาน", station: "ของหวาน" },
  { name: "ไอศกรีมกะทิ", price: 35, category: "ของหวาน", station: "ของหวาน" },
];

const inferStation = (menu) => {
  const name = menu.name || "";
  const category = menu.category || "";

  if (category === "เครื่องดื่ม") return "เครื่องดื่ม";
  if (category === "ของหวาน") return "ของหวาน";
  if (name.includes("ต้ม") || name.includes("แกง") || name.includes("สุกี้")) {
    return "เตาต้ม";
  }
  if (name.includes("ย่าง")) return "เตาย่าง";
  if (name.includes("ทอด") || name.includes("เฟรนช์ฟรายส์")) return "ทอด";
  if (name.includes("ส้มตำ")) return "ส้มตำ";
  if (
    name.includes("ผัด") ||
    name.includes("กะเพรา") ||
    name.includes("กระเทียม") ||
    name.includes("คะน้า") ||
    name.includes("ราดหน้า") ||
    name.includes("ไข่")
  ) {
    return "เตาผัด";
  }

  return "ครัวทั่วไป";
};

const seedDefaultMenus = async () => {
  const existingMenus = await Menu.find().select("name category station");
  const existingNames = new Set(existingMenus.map((menu) => menu.name));
  const missingMenus = defaultMenus.filter(
    (menu) => !existingNames.has(menu.name)
  );

  if (missingMenus.length > 0) {
    await Menu.insertMany(
      missingMenus.map((menu) => ({
        ...menu,
        available: true,
      }))
    );
  }

  await Promise.all(
    existingMenus
      .filter((menu) => !menu.station || menu.station === "ครัวทั่วไป")
      .map((menu) => {
        const station = inferStation(menu);
        if (station === "ครัวทั่วไป") return null;
        menu.station = station;
        return menu.save();
      })
      .filter(Boolean)
  );
};

const normalizeMenuPayload = (body) => {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const station = String(body.station || "").trim() || "ครัวทั่วไป";
  const price = Number(body.price);

  if (!name) {
    return {
      error: "กรุณากรอกชื่อเมนู",
    };
  }

  if (!category) {
    return {
      error: "กรุณาเลือกหมวดหมู่",
    };
  }

  if (!Number.isFinite(price) || price < 0) {
    return {
      error: "ราคาต้องเป็นตัวเลขและห้ามติดลบ",
    };
  }

  return {
    value: {
      name,
      price,
      category,
      station,
      image: body.image,
      available:
        typeof body.available === "boolean"
          ? body.available
          : true,
    },
  };
};

const createMenu = async (req, res) => {
  try {
    const { value, error } = normalizeMenuPayload(req.body);

    if (error) {
      return res.status(400).json({
        message: error,
      });
    }

    const menu = await Menu.create(value);
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMenus = async (req, res) => {
  try {
    await seedDefaultMenus();
    const menus = await Menu.find().sort({ station: 1, category: 1, name: 1 });

    res.json(menus);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { value, error } = normalizeMenuPayload(req.body);

    if (error) {
      return res.status(400).json({
        message: error,
      });
    }

    const menu = await Menu.findByIdAndUpdate(req.params.id, value, {
      new: true,
    });

    if (!menu) {
      return res.status(404).json({
        message: "Menu not found",
      });
    }

    res.json(menu);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndDelete(req.params.id);

    if (!menu) {
      return res.status(404).json({
        message: "Menu not found",
      });
    }

    res.json({
      message: "Menu deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createMenu,
  getMenus,
  updateMenu,
  deleteMenu,
  stations,
};
