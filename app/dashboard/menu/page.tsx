'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, MenuItem } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';

export default function MenuManagement() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Main Course',
    base_price: '',
    image_url: '',
    is_mystery: false,
    mystery_type: 'ANY' as 'VEG' | 'NON_VEG' | 'ANY',
    is_veg: true,
  });

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'RESTAURANT')) {
      router.push('/');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'RESTAURANT') {
      fetchRestaurant();
    }
  }, [profile]);

  const fetchRestaurant = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_phone', profile!.phone)
      .maybeSingle();

    if (data) {
      setRestaurant(data);
      fetchMenuItems(data.id);
    }
    setLoading(false);
  };

  const fetchMenuItems = async (restaurantId: string) => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true });

    if (data) {
      setMenuItems(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurant) return;

    const basePrice = parseInt(formData.base_price);
    const sellingPrice = basePrice + restaurant.tech_fee;

    const { error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurant.id,
        name: formData.name,
        category: formData.category,
        base_price: basePrice,
        selling_price: sellingPrice,
        image_url: formData.image_url || null,
        is_mystery: formData.is_mystery,
        mystery_type: formData.is_mystery ? formData.mystery_type : null,
        is_veg: formData.is_veg,
        is_available: true,
        is_clearance: false,
        stock_remaining: 0,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Menu item added successfully!',
      });
      setDialogOpen(false);
      setFormData({
        name: '',
        category: 'Main Course',
        base_price: '',
        image_url: '',
        is_mystery: false,
        mystery_type: 'ANY',
        is_veg: true,
      });
      fetchMenuItems(restaurant.id);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile || !restaurant) return;

    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      toast({
        title: 'Error',
        description: 'CSV file must have at least a header row and one data row',
        variant: 'destructive',
      });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['name', 'category', 'base_price'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      toast({
        title: 'Error',
        description: `CSV missing required columns: ${missingHeaders.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    const items = [];
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const item: any = {};
      headers.forEach((header, index) => {
        item[header] = values[index];
      });

      const basePrice = parseInt(item.base_price);
      if (isNaN(basePrice)) {
        errors++;
        continue;
      }

      items.push({
        restaurant_id: restaurant.id,
        name: item.name,
        category: item.category || 'Main Course',
        base_price: basePrice,
        selling_price: basePrice + restaurant.tech_fee,
        image_url: item.image_url || null,
        is_veg: item.is_veg === 'true' || item.is_veg === '1' || item.is_veg === 'yes',
        is_mystery: false,
        mystery_type: null,
        is_available: true,
        is_clearance: false,
        stock_remaining: 0,
      });
    }

    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid items found in CSV',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('menu_items').insert(items);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `${items.length} items imported successfully!${errors > 0 ? ` (${errors} rows skipped due to errors)` : ''}`,
      });
      setCsvDialogOpen(false);
      setCsvFile(null);
      fetchMenuItems(restaurant.id);
    }
  };

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentStatus })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchMenuItems(restaurant!.id);
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });
      fetchMenuItems(restaurant!.id);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</Link>
            <h1 className="text-2xl font-bold">Menu Management</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Menu Items from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      CSV should have columns: name, category, base_price, image_url (optional), is_veg (optional, true/false)
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Example: name,category,base_price,is_veg<br/>
                      Paneer Tikka,Starters,180,true
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={handleCsvImport}
                    disabled={!csvFile}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    Import Items
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Menu Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price (₹)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    required
                  />
                  {formData.base_price && restaurant && (
                    <p className="text-xs text-muted-foreground">
                      Selling Price: {formatPrice(parseInt(formData.base_price) + restaurant.tech_fee)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_veg"
                    checked={formData.is_veg}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_veg: checked })}
                  />
                  <Label htmlFor="is_veg">Vegetarian</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_mystery"
                    checked={formData.is_mystery}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_mystery: checked })}
                  />
                  <Label htmlFor="is_mystery">Mystery Box Item</Label>
                </div>
                {formData.is_mystery && (
                  <div className="space-y-2">
                    <Label htmlFor="mystery_type">Mystery Type</Label>
                    <Select
                      value={formData.mystery_type}
                      onValueChange={(value: 'VEG' | 'NON_VEG' | 'ANY') => setFormData({ ...formData, mystery_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VEG">Vegetarian</SelectItem>
                        <SelectItem value="NON_VEG">Non-Vegetarian</SelectItem>
                        <SelectItem value="ANY">Any</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full">Add Item</Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems
                .filter(item => item.category === category)
                .map(item => (
                  <Card key={item.id}>
                    <CardHeader>
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      )}
                      <CardTitle className="text-lg flex items-center gap-2">
                        {item.is_mystery && '🎁'}
                        {item.name}
                      </CardTitle>
                      <CardDescription>
                        Base: {formatPrice(item.base_price)} → Selling: {formatPrice(item.selling_price)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Available</Label>
                        <Switch
                          checked={item.is_available}
                          onCheckedChange={() => toggleAvailability(item.id, item.is_available)}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
